import * as THREE from "three";
import { easeOutExpo } from "./animation";

/**
 * 친을 세는 표시와, 다 세고 나서 진짜 친 앞에 놓는 표시패.
 *
 * 세는 방법이 이 그림의 요점이다. 굴린 사람을 1 로 두고 반시계로 한 자리씩
 * 옮겨 가며 1, 2, 3 … 을 세고, 눈의 합에서 멈춘 자리가 친이다. 그래서 표시가
 * 목적지로 곧장 미끄러지지 않고 자리마다 또박또박 멈추며 숫자를 바꾼다.
 */

/**
 * 테두리가 판 중심에서 떨어진 거리. 그 자리 사람의 손을 감싸는 자리다.
 * 패산 안쪽에 두면 이 각도에서 패산에 가려 보이지 않는다.
 */
const RING_RADIUS = 12.3;
/**
 * 표시패가 놓이는 거리와, 정면에서 왼쪽으로 비켜 놓는 거리. 패산에 가깝게 두면
 * 이 각도에서 패산 뒤로 숨고, 정면에 두면 손과 겹친다.
 */
const PLAQUE_RADIUS = 11.4;
const PLAQUE_ASIDE = -3.2;
const PLAQUE = { w: 2.6, h: 0.34, l: 1.5 } as const;
/** 한 자리에 머무는 동안 앞자리에서 옮겨 오는 데 쓰는 시간의 비율. */
const HOP = 0.55;
/** 셀 수 있는 가장 큰 수. 주사위 두 개의 합이라 12 를 넘지 않는다. */
const MAX_COUNT = 12;

function makeRingFace() {
  const SIZE = 256;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = SIZE * 0.06;
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(251, 191, 36, 0.2)";
  ctx.fill();
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 세는 숫자. 판에 눕혀 그리면 자리마다 기울기와 위아래가 달라져 읽기 어려우니,
 * 언제나 화면을 향하는 판때기에 그려 자리 위에 띄운다.
 */
function makeCount(value: number) {
  const SIZE = 256;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `bold ${SIZE * 0.72}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = SIZE * 0.07;
  ctx.strokeStyle = "#1f2937";
  ctx.strokeText(String(value), SIZE / 2, SIZE / 2);
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(String(value), SIZE / 2, SIZE / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePlaqueFace() {
  const SIZE = 128;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE * 2;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f4ecd8";
  ctx.fillRect(0, 0, SIZE * 2, SIZE);
  ctx.fillStyle = "#b91c1c";
  ctx.font = `bold ${SIZE * 0.7}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("親", SIZE, SIZE / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createDealerMark(): {
  group: THREE.Group;
  /**
   * from 은 1 을 세는 자리(東 을 0 으로 하고 반시계로 센 번호)이고, steps 는
   * 눈의 합, progress 는 세어 나간 정도다. ring 과 plaque 는 각각의 진하기다.
   */
  place: (
    from: number,
    steps: number,
    progress: number,
    ring: number,
    plaque: number
  ) => void;
  dispose: () => void;
} {
  const group = new THREE.Group();

  const ringGeometry = new THREE.PlaneGeometry(5.6, 5.6);
  const ringFace = makeRingFace();
  const ringMaterial = new THREE.MeshBasicMaterial({ map: ringFace, transparent: true });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.04, RING_RADIUS);
  group.add(ring);

  // 숫자마다 그림이 다르므로 미리 다 그려 두고 텍스처만 갈아 끼운다.
  const counts = Array.from({ length: MAX_COUNT }, (_, i) => makeCount(i + 1));
  const digitGeometry = new THREE.PlaneGeometry(3.4, 3.4);
  // 숫자는 손보다 앞에 그린다. 가려지면 무엇을 세는 그림인지 알 수 없다.
  const digitMaterial = new THREE.MeshBasicMaterial({
    map: counts[0],
    transparent: true,
    depthTest: false
  });
  const digit = new THREE.Mesh(digitGeometry, digitMaterial);
  digit.renderOrder = 2;
  digit.position.set(0, 3.2, RING_RADIUS);
  group.add(digit);

  // 카메라를 향하는 방향. 카메라가 (1,1,1) 에 고정이라 한 번만 구하면 된다.
  const billboard = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0)
    )
  );
  const unturn = new THREE.Quaternion();

  const plaqueGeometry = new THREE.BoxGeometry(PLAQUE.w, PLAQUE.h, PLAQUE.l);
  const wood = new THREE.MeshStandardMaterial({ color: "#e7dcc2", roughness: 0.7 });
  const top = new THREE.MeshStandardMaterial({ map: makePlaqueFace(), roughness: 0.6 });
  // 상자 면의 차례는 +X, -X, +Y, -Y, +Z, -Z 다. 글자는 위(+Y)에 있다.
  const plaque = new THREE.Mesh(plaqueGeometry, [wood, wood, top, wood, wood, wood]);
  plaque.position.set(PLAQUE_ASIDE, PLAQUE.h / 2, PLAQUE_RADIUS);
  group.add(plaque);

  return {
    group,
    place(from, steps, progress, ringOpacity, plaqueOpacity) {
      // 지금 세고 있는 수. 진행도를 걸음 수로 나눠 한 칸씩 올라간다.
      const walked = progress * steps;
      const count = Math.min(steps, Math.floor(walked) + 1);
      const hop = easeOutExpo(Math.min(1, (walked - (count - 1)) / HOP));
      // 첫 수는 굴린 사람 자리에 그대로 서고, 그다음부터 앞자리에서 건너온다.
      const seat = from + (count - 1) - (count > 1 ? 1 - hop : 0);

      group.rotation.y = seat * (Math.PI / 2);
      ring.visible = ringOpacity > 0.01;
      ringMaterial.opacity = ringOpacity;
      // 건너오는 동안 살짝 떠올라, 자리를 옮겼다는 것이 눈에 띈다.
      const lift = count > 1 ? Math.sin(hop * Math.PI) * 0.8 : 0;
      ring.position.y = 0.04 + lift;

      digit.visible = ringOpacity > 0.01;
      digitMaterial.map = counts[Math.min(MAX_COUNT, Math.max(1, count)) - 1];
      digitMaterial.opacity = ringOpacity;
      digit.position.y = 3.2 + lift;
      // 무리가 돌아간 만큼 되돌려, 어느 자리에 있든 숫자가 똑바로 선다.
      unturn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -group.rotation.y);
      digit.quaternion.copy(unturn).multiply(billboard);

      plaque.visible = plaqueOpacity > 0.01;
      // 놓이는 순간 위에서 내려앉는다.
      plaque.position.y = PLAQUE.h / 2 + (1 - plaqueOpacity) * 4;
    },
    dispose() {
      ringGeometry.dispose();
      ringFace.dispose();
      ringMaterial.dispose();
      digitGeometry.dispose();
      for (const texture of counts) texture.dispose();
      digitMaterial.dispose();
      plaqueGeometry.dispose();
      wood.dispose();
      top.map?.dispose();
      top.dispose();
    }
  };
}
