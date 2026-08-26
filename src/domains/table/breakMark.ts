import * as THREE from "three";
import { stagger } from "./animation";
import { makeCountFace } from "./dealerMark";
import { TILE_SIZE, stackSpot } from "./wall";

/**
 * 패산을 어디서 끊을지 세는 표시.
 *
 * 주사위 눈의 합은 두 번 쓰인다. 한 번은 누구의 패산을 쓸지 세는 데(dealerMark),
 * 다시 한 번은 그 사람 오른쪽 끝에서 몇 번째 스택 옆을 끊을지 세는 데다. 두
 * 번째 쓰임이 그림에 없으면 왕패 자리가 주사위와 무관하게 정해진 것처럼 보인다.
 * 그래서 스택 위에 1, 2, 3 … 을 얹고, 다 세면 끊는 자리에 금을 긋는다.
 */

/** 숫자가 스택 위에 뜨는 높이. 패산 두 단(1.44) 위다. */
const DIGIT_HEIGHT = 2.4;
const DIGIT_SIZE = 1.5;
/** 한 스택을 세는 데 쓰는 진행도의 비율. 짧게 잡아야 또박또박 짚어 나간다. */
const COUNT_SPAN = 0.3;
/** 끊는 자리에 세우는 금의 크기. 패산보다 조금 높아 위로 삐죽 나온다. */
const CUT = { w: 0.16, h: 2.6, l: TILE_SIZE.l * 1.3 } as const;
/** 셀 수 있는 가장 큰 수. 주사위 두 개의 합이라 12 를 넘지 않는다. */
const MAX_COUNT = 12;

export function createBreakMark(): {
  group: THREE.Group;
  /**
   * side 는 끊을 패산의 변, steps 는 그 변의 오른쪽 끝에서 세는 스택 수(곧 눈의
   * 합)다. progress 는 세어 나간 정도, opacity 는 표시 전체의 진하기다.
   */
  place: (side: number, steps: number, progress: number, opacity: number) => void;
  dispose: () => void;
} {
  const group = new THREE.Group();

  // 카메라가 (1,1,1) 에 고정이라 향하는 방향을 한 번만 구하면 된다. 숫자를 판에
  // 눕히면 변마다 위아래가 뒤집혀 읽기 어렵다.
  const billboard = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0)
    )
  );

  const faces = Array.from({ length: MAX_COUNT }, (_, i) => makeCountFace(i + 1));
  const digitGeometry = new THREE.PlaneGeometry(DIGIT_SIZE, DIGIT_SIZE);
  // 숫자는 패산보다 앞에 그린다. 가려지면 무엇을 세는 그림인지 알 수 없다.
  const digits = faces.map(face => {
    const material = new THREE.MeshBasicMaterial({
      map: face,
      transparent: true,
      depthTest: false
    });
    const mesh = new THREE.Mesh(digitGeometry, material);
    mesh.renderOrder = 2;
    mesh.quaternion.copy(billboard);
    mesh.visible = false;
    group.add(mesh);
    return { mesh, material };
  });

  const cutGeometry = new THREE.BoxGeometry(CUT.w, CUT.h, CUT.l);
  const cutMaterial = new THREE.MeshBasicMaterial({
    color: "#fbbf24",
    transparent: true,
    depthTest: false
  });
  const cut = new THREE.Mesh(cutGeometry, cutMaterial);
  cut.renderOrder = 2;
  group.add(cut);

  return {
    group,
    place(side, steps, progress, opacity) {
      group.visible = opacity > 0.01;
      const counting = Math.min(MAX_COUNT, steps);

      digits.forEach(({ mesh, material }, i) => {
        if (i >= counting) {
          mesh.visible = false;
          return;
        }
        // 오른쪽 끝(스택 0)에서부터 한 칸씩 짚어 나간다.
        const shown = stagger(i, counting, progress, COUNT_SPAN);
        mesh.visible = shown > 0.01 && opacity > 0.01;
        material.opacity = shown * opacity;
        const spot = stackSpot(side, i);
        // 짚는 순간 위에서 내려앉아, 어느 칸을 세고 있는지 눈에 띈다.
        mesh.position.set(spot.x, DIGIT_HEIGHT + (1 - shown) * 1.2, spot.z);
      });

      // 금은 다 세고 나서 마지막 스택 바깥쪽 이음매에 선다. 세는 도중에 미리
      // 그으면 어디서 끊을지를 세어서 찾는다는 것이 드러나지 않는다.
      const drawn = stagger(counting, counting + 1, progress, COUNT_SPAN);
      cut.visible = drawn > 0.01 && opacity > 0.01;
      cutMaterial.opacity = drawn * opacity;
      const last = stackSpot(side, counting - 1);
      const next = stackSpot(side, counting);
      cut.position.set((last.x + next.x) / 2, CUT.h / 2, (last.z + next.z) / 2);
      cut.rotation.y = last.rotationY;
    },
    dispose() {
      digitGeometry.dispose();
      for (const { material } of digits) material.dispose();
      for (const face of faces) face.dispose();
      cutGeometry.dispose();
      cutMaterial.dispose();
    }
  };
}
