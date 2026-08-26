import * as THREE from "three";
import { easeOutExpo, phase } from "./animation";

/**
 * 판 가운데에서 구르는 주사위 두 개. 선이 굴린 눈의 합이 어느 패산을 어디서
 * 끊을지 정한다(wall.ts 의 breakPoint 참고).
 *
 * 눈은 캔버스에 점을 찍어 텍스처로 쓴다. 자리 글자와 같은 방법이라, 주사위
 * 하나 그리자고 모델 파일과 로더를 들이지 않는다.
 */

const SIZE = 1.15;
/** 던지는 사람의 손이 있는 자리. 주사위는 여기서 판 가운데로 날아간다. */
const THROW_RADIUS = 11;
const THROW_HEIGHT = 2.4;
/** 손을 떠나 판에 닿기까지 쓰는 진행도. 나머지는 튀다가 멈추는 데 쓴다. */
const FLIGHT = 0.4;
/** 날아가는 동안 포물선이 솟는 높이. */
const ARC = 3.2;
/** 처음 닿고 튀어 오르는 높이. */
const BOUNCE = 1.6;
/**
 * 다 쓴 뒤 판 아래로 가라앉는 깊이. 판은 배경색이라 바닥 면이 따로 없으므로,
 * 가라앉는 만큼 함께 옅어지게 해서 바닥으로 꺼지는 것으로 보이게 한다.
 */
const SINK_DEPTH = 2.5;
/**
 * 한 번 튈 때마다 남는 속도의 비율. 높이는 이 값의 제곱으로, 튀는 시간은 이
 * 값 그대로 줄어든다. 등비급수의 합이 1 이라, 튀는 구간이 남는 진행도를 꼭
 * 채우고 끝난다.
 */
const RESTITUTION = 0.55;

/**
 * 판에 닿은 뒤 t 만큼 지났을 때 떠 있는 높이. 튈 때마다 낮아지고 짧아지는
 * 포물선을 이어 붙인 것으로, 실제로 튀는 물건과 같은 모양이다.
 */
function bounceHeight(t: number, height: number): number {
  let start = 0;
  let span = 1 - RESTITUTION;
  let peak = height;
  // 여섯 번쯤 튀면 높이가 눈에 보이지 않을 만큼 낮아진다.
  for (let i = 0; i < 6; i += 1) {
    if (t < start + span) {
      const local = (t - start) / span;
      return 4 * local * (1 - local) * peak;
    }
    start += span;
    span *= RESTITUTION;
    peak *= RESTITUTION * RESTITUTION;
  }
  return 0;
}
/** 상자 면의 차례는 +X, -X, +Y, -Y, +Z, -Z 다. 마주 보는 두 면의 합이 7이다. */
const FACES = [3, 4, 1, 6, 2, 5] as const;

/** 그 눈이 위로 오게 하는 회전. 어느 면이 +Y 로 가야 하는지로 정해진다. */
const UPRIGHT: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0]
};

/** 눈의 점이 놓이는 자리. 한 면을 3×3 으로 나눈 칸 번호다. */
const PIPS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2]
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2]
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2]
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2]
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2]
  ]
};

function makeFace(value: number) {
  const CANVAS = 128;
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS;
  canvas.height = CANVAS;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#faf7f2";
  ctx.fillRect(0, 0, CANVAS, CANVAS);
  ctx.fillStyle = value === 1 || value === 4 ? "#dc2626" : "#1f2937";
  const cell = CANVAS / 3;
  for (const [col, row] of PIPS[value]) {
    ctx.beginPath();
    ctx.arc(cell * (col + 0.5), cell * (row + 0.5), CANVAS * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 두 눈의 합을 크게 적은 판. 굴린 결과를 한 번 짚고 세기 시작한다. */
function makeSum(value: number) {
  const SIZE = 256;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fbbf24";
  ctx.font = `bold ${SIZE * 0.62}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(value), SIZE / 2, SIZE / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 주사위 두 개의 합이 놓이는 범위. */
const SUMS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * 주사위 두 개를 한 덩어리로 만든다. roll 로 구르는 정도를 정한다.
 * 0 이면 아직 없고, 1 이면 정해진 눈이 위를 보고 멈춰 있다.
 */
export function createDice(): {
  group: THREE.Group;
  roll: (
    progress: number,
    values: readonly [number, number],
    from: number,
    sink: number
  ) => void;
  /** 두 눈의 합을 주사위 위에 크게 띄운다. 0 이면 없고 1 이면 또렷하다. */
  showSum: (opacity: number, value: number) => void;
  dispose: () => void;
} {
  const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
  const materials = FACES.map(
    value =>
      new THREE.MeshStandardMaterial({
        map: makeFace(value),
        roughness: 0.45,
        transparent: true
      })
  );

  const group = new THREE.Group();
  const dice = [0, 1].map(i => {
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.x = (i - 0.5) * SIZE * 1.6;
    group.add(mesh);
    return mesh;
  });

  // 합은 주사위 위에 떠 있는 판에 적는다. 카메라가 (1,1,1) 에 고정되어 있으므로
  // 그쪽을 보도록 한 번만 돌려 두면 늘 정면으로 읽힌다.
  const sums = SUMS.map(makeSum);
  const sumGeometry = new THREE.PlaneGeometry(5, 5);
  const sumMaterial = new THREE.MeshBasicMaterial({
    map: sums[0],
    transparent: true,
    depthTest: false
  });
  const sumPlate = new THREE.Mesh(sumGeometry, sumMaterial);
  sumPlate.renderOrder = 2;
  sumPlate.position.set(0, 4.6, 0);
  sumPlate.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().lookAt(
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0)
    )
  );
  group.add(sumPlate);

  const spin = new THREE.Quaternion();
  const target = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();

  return {
    group,
    /**
     * 눈과 던지는 사람은 부를 때마다 받는다. 한 장면에서 다른 사람이 두 번
     * 굴리는 곳이 있어서다. from 은 굴리는 사람의 자리 번호로, 東 을 0 으로
     * 하고 반시계로 센다. sink 는 다 쓰고 판 아래로 꺼지는 정도다.
     */
    roll(progress: number, values: readonly [number, number], from: number, sink: number) {
      group.visible = progress > 0.01 && sink < 0.99;
      const fade = Math.min(1, progress * 6) * (1 - sink);
      for (const material of materials) material.opacity = fade;
      const angle = from * (Math.PI / 2);
      const fly = phase(progress, 0, FLIGHT);
      const land = phase(progress, FLIGHT, 1);
      dice.forEach((mesh, i) => {
        // 멈추는 자리는 판 가운데다. 두 개가 겹치지 않게 옆으로 조금 벌린다.
        const aside = (i - 0.5) * SIZE * 1.6;
        start.set(
          Math.sin(angle) * THROW_RADIUS + Math.cos(angle) * aside,
          THROW_HEIGHT,
          Math.cos(angle) * THROW_RADIUS - Math.sin(angle) * aside
        );
        end.set(aside, SIZE / 2, 0);
        // 손을 떠난 뒤 가로 속도는 변하지 않는다. 그래서 곧게 날아가고,
        // 높이만 포물선을 그린다.
        mesh.position.lerpVectors(start, end, fly);
        mesh.position.y =
          fly < 1
            ? start.y + (end.y - start.y) * fly + 4 * fly * (1 - fly) * ARC
            : end.y + bounceHeight(land, BOUNCE);
        mesh.position.y -= sink * SINK_DEPTH;

        target.setFromEuler(euler.set(...UPRIGHT[values[i]]));
        // 날아가는 동안과 첫 번째 튐까지는 마구 구르고, 그 뒤로 정해진 눈으로
        // 미끄러져 멈춘다. 튀는 도중에 눈이 정해져 버리면 굴린 것으로 보이지
        // 않는다.
        const settle = easeOutExpo(phase(land, 1 - RESTITUTION, 1));
        euler.set(progress * (14 + i * 3), progress * (11 - i * 2), progress * (17 + i));
        spin.setFromEuler(euler);
        mesh.quaternion.copy(spin).slerp(target, settle);
      });
    },
    showSum(opacity: number, value: number) {
      sumPlate.visible = opacity > 0.01;
      sumMaterial.opacity = opacity;
      sumMaterial.map = sums[Math.min(12, Math.max(2, value)) - 2];
      // 뜰 때 살짝 커진다.
      sumPlate.scale.setScalar(0.7 + opacity * 0.3);
    },
    dispose() {
      geometry.dispose();
      for (const material of materials) {
        material.map?.dispose();
        material.dispose();
      }
      sumGeometry.dispose();
      for (const texture of sums) texture.dispose();
      sumMaterial.dispose();
    }
  };
}
