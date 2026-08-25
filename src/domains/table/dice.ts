import * as THREE from "three";
import { easeOutExpo } from "./animation";

/**
 * 판 가운데에서 구르는 주사위 두 개. 선이 굴린 눈의 합이 어느 패산을 어디서
 * 끊을지 정한다(wall.ts 의 breakPoint 참고).
 *
 * 눈은 캔버스에 점을 찍어 텍스처로 쓴다. 자리 글자와 같은 방법이라, 주사위
 * 하나 그리자고 모델 파일과 로더를 들이지 않는다.
 */

const SIZE = 1.15;
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
  roll: (progress: number, values: readonly [number, number]) => void;
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

  return {
    group,
    /** 눈은 부를 때마다 받는다. 한 장면에서 두 번 굴리는 곳이 있어서다. */
    roll(progress: number, values: readonly [number, number]) {
      group.visible = progress > 0.01;
      for (const material of materials) material.opacity = Math.min(1, progress * 4);
      dice.forEach((mesh, i) => {
        target.setFromEuler(euler.set(...UPRIGHT[values[i]]));
        // 처음에는 마구 구르다가 정해진 눈으로 미끄러져 멈춘다. 끝에서는
        // 섞은 각도가 그대로 목표 각도가 되어 딱 떨어진다.
        const settle = easeOutExpo(progress);
        euler.set(progress * (14 + i * 3), progress * (11 - i * 2), progress * (17 + i));
        spin.setFromEuler(euler);
        mesh.quaternion.copy(spin).slerp(target, settle);
        // 구르는 동안 한 번 튀어 오른다.
        mesh.position.y = SIZE / 2 + Math.sin(Math.min(1, progress) * Math.PI) * 1.6;
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
