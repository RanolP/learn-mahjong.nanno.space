import * as THREE from "three";
import { ENTRY_HEIGHT, easeOutExpo, phase } from "./animation";
import { DRAWN, WINDS, pickBeats, pickPathAngle, standAside } from "./seats";
import { TILE_SIZE } from "./wall";

/**
 * 자리를 정하려고 뽑는 동남서북 패 네 장.
 *
 * 뽑는 장면은 두 마당이다. 먼저 네 장을 펼쳐 어떤 바람이 있는지 보여 주고
 * 엎어서 섞는다. 그다음 네 사람이 엎어진 채로 한 장씩 가져가 뒤집는다. 섞는
 * 동안 등만 보이므로 어느 패가 어디로 갔는지 따라갈 수 없다 — 그것이 이
 * 장면의 요점이다.
 */

/** 뽑은 패가 놓이는 자리. 패산 바깥, 그 패를 뽑은 사람 앞이다. */
const RADIUS = 10.6;
/** 그 사람 정면에서 오른쪽으로 비켜 놓는 거리. 손과 겹치지 않게 옆으로 빼 둔다. */
const ASIDE = 2.9;
/** 판 가운데에 늘어놓을 때의 간격. */
const CENTER_PITCH = 3.7;
/** 보여 줄 때 얼마나 크게 하는지. 판 가운데에서 네 바람을 읽을 수 있어야 한다. */
const SHOW_SCALE = 1.7;
/**
 * 섞을 때 패가 도는 원의 반지름과, 그 반지름이 밀렸다 당겨지는 폭.
 *
 * 실제 세패(洗牌)는 패를 엎어 판에 깔고 손으로 둥글게 휘저어 섞는다. 패는
 * 판에서 떨어지지 않고 미끄러지며 돌고, 서로 부딪혀 방향이 틀어진다. 그래서
 * 여기서도 패를 띄우지 않고 판에 붙인 채 돌린다.
 */
const MIX_RADIUS = 3;
const WOBBLE = 1.2;
/**
 * 휘젓는 동안 도는 바퀴 수. 손으로 젓는 속도라 초당 한 바퀴를 넘지 않는다.
 * 더 빨리 돌리면 섞는 손이 아니라 튕겨 나간 것으로 보인다.
 */
const TURNS = 1.5;
/** 미끄러지며 제자리에서 도는 정도. 1 이면 한 바퀴 도는 동안 저도 한 바퀴 돈다. */
const SPIN_RATIO = 1;
/**
 * 장마다 다른 시작 각도, 도는 빠르기, 반지름이 밀렸다 당겨지는 빠르기. 넷이
 * 같은 원을 같은 속도로 돌면 회전판처럼 보여 섞이는 것으로 읽히지 않는다.
 * 빠르기를 어긋나게 두어야 서로 앞지르고 스치며 지나간다.
 */
const SWIRL = [
  { phase: 0, speed: 1.15, wobble: 2 },
  { phase: Math.PI / 2, speed: 0.82, wobble: 3 },
  { phase: Math.PI, speed: 1.34, wobble: 2 },
  { phase: (3 * Math.PI) / 2, speed: 0.95, wobble: 4 }
] as const;
/** 다 섞고 나서 한 줄로 모을 때의 간격. 패 너비가 1.8 이라 조금 벌어져 선다. */
const ROW_PITCH = 2.2;

/**
 * 섞기 마당 안의 박자 경계. 보여 주기, 멈춤, 엎어 깔기, 휘젓기, 한 줄로 모으기
 * 순이다. 휘젓기가 절반을 차지한다. 빠르게 돌려서가 아니라 네 장이 서로 스쳐
 * 지나가면서 어느 장이 어디로 갔는지 놓치게 만드는 대목이라, 손으로 젓는
 * 속도로 충분히 오래 돌려야 한다.
 */
const SHOW_END = 0.15;
const HOLD_END = 0.36;
const LAY_END = 0.5;
const GATHER_START = 0.86;

function makeFace(text: string) {
  const SIZE = 128;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f4ecd8";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = "#1f2937";
  ctx.font = `bold ${SIZE * 0.72}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, SIZE / 2, SIZE / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createPicks(): {
  group: THREE.Group;
  place: (mix: number, draw: number) => void;
  dispose: () => void;
} {
  // 뽑은 바람을 읽을 수 있어야 하는 그림이라, 패산의 패보다 크게 그린다.
  const SCALE = 1.8;
  const geometry = new THREE.BoxGeometry(
    TILE_SIZE.w * SCALE,
    TILE_SIZE.h * SCALE,
    TILE_SIZE.l * SCALE
  );
  const LIFT = (TILE_SIZE.h * SCALE) / 2;
  const ivory = new THREE.MeshStandardMaterial({
    color: "#f4ecd8",
    roughness: 0.6,
    transparent: true
  });
  const back = new THREE.MeshStandardMaterial({
    color: "#1d4ed8",
    roughness: 0.5,
    transparent: true
  });

  const group = new THREE.Group();
  const faces: THREE.MeshStandardMaterial[] = [];
  // 그림이 아래(-Y)에 있어, 손대지 않으면 엎어진 모습이다. 반 바퀴 뒤집으면
  // 그림이 위를 본다.
  const faceUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0));
  // 패는 자리가 아니라 뽑는 차례에 매인다. i 번째로 집는 사람이 DRAWN[i] 바람을
  // 뽑으므로, 그 패에 그 바람 글자를 그린다.
  const picks = WINDS.map((_, i) => {
    const face = new THREE.MeshStandardMaterial({
      map: makeFace(WINDS[DRAWN[i]]),
      roughness: 0.6,
      transparent: true
    });
    faces.push(face);
    // 상자 면의 차례는 +X, -X, +Y, -Y, +Z, -Z 다.
    const mesh = new THREE.Mesh(geometry, [ivory, ivory, back, face, ivory, ivory]);
    group.add(mesh);
    /** 펼쳐 놓을 때의 자리. */
    return { mesh, shown: (i - 1.5) * CENTER_PITCH };
  });

  const down = new THREE.Quaternion();
  const from = new THREE.Vector3();
  const row = new THREE.Vector3();
  const target = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const yaw = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const UP = new THREE.Vector3(0, 1, 0);
  const TAU = Math.PI * 2;

  return {
    group,
    /**
     * mix 는 펼쳐 보이고, 엎어 휘젓고, 한 줄로 모으기까지의 진행도다. draw 는 네 사람이 차례로
     * 한 장씩 집어 뒤집어 읽고 앉기까지의 진행도이고, 그 안에서 사람마다의
     * 박자는 pickBeats 가 잘라 준다.
     */
    place(mix: number, draw: number) {
      group.visible = mix > 0.001;
      const fade = Math.min(1, mix * 8);
      ivory.opacity = fade;
      back.opacity = fade;
      for (const face of faces) face.opacity = fade;

      const rise = phase(mix, 0, SHOW_END);
      const lay = phase(mix, HOLD_END, LAY_END);
      // 휘젓기는 끝까지 이어지고, 모으기는 그 위에 겹쳐 든다. 휘젓다 멈춘 뒤에
      // 모으면 두 동작 사이가 끊겨 보인다.
      const spin = phase(mix, LAY_END, 1);
      const gather = easeOutExpo(phase(mix, GATHER_START, 1));

      picks.forEach(({ mesh, shown }, i) => {
        // 처음에는 크게 펼쳐 네 바람을 읽히고, 엎으면서 제 크기로 줄어든다.
        mesh.scale.setScalar(1 + (SHOW_SCALE - 1) * (1 - lay));

        // 판에 붙은 채 미끄러지며 돈다. 반지름이 밀렸다 당겨져 안팎으로도
        // 흔들리므로, 도는 길이 매끈한 원이 되지 않는다.
        const { phase: start, speed, wobble } = SWIRL[i];
        const sweep = start + spin * TURNS * TAU * speed;
        const radius = MIX_RADIUS + Math.sin(spin * TAU * wobble + start) * WOBBLE;
        from.set(Math.sin(sweep) * radius, LIFT, Math.cos(sweep) * radius);
        // 다 섞으면 한 줄로 모은다. 네 사람이 차례로 한 장씩 집어 갈 줄이다.
        row.set((i - 1.5) * ROW_PITCH, LIFT, 0);
        from.lerp(row, gather);
        from.x += (shown - from.x) * (1 - lay);
        from.z += (0 - from.z) * (1 - lay);
        from.y += (1 - rise) * ENTRY_HEIGHT;

        // 패는 그것을 집은 사람 앞에 놓인다. 그 사람이 읽고 나서 자리로 옮겨
        // 가면, 들고 있는 패도 함께 간다.
        const { take, read, sit } = pickBeats(i, draw);
        const angle = pickPathAngle(i, sit);
        const aside = ASIDE + standAside(i, sit);
        target.set(
          Math.sin(angle) * RADIUS + Math.cos(angle) * aside,
          LIFT,
          Math.cos(angle) * RADIUS - Math.sin(angle) * aside
        );
        mesh.position.lerpVectors(from, target, take);
        mesh.position.y += Math.sin(take * Math.PI) * 1.6;

        // 펼쳤을 때는 그림이 위, 엎으면 등이 위, 집어 온 뒤 읽으려고 뒤집으면
        // 그것을 든 사람이 읽을 방향으로 그림이 위다.
        mesh.quaternion.copy(faceUp).slerp(down, lay);
        // 미끄러지는 동안 제자리에서도 돌고, 줄로 모이면서 똑바로 선다.
        yaw.setFromAxisAngle(UP, sweep * SPIN_RATIO * (1 - gather));
        mesh.quaternion.premultiply(yaw);
        if (read > 0.001) {
          turn.setFromEuler(euler.set(Math.PI, -angle, 0, "YXZ"));
          mesh.quaternion.slerp(turn, easeOutExpo(read));
        }
      });
    },
    dispose() {
      geometry.dispose();
      ivory.dispose();
      back.dispose();
      for (const face of faces) {
        face.map?.dispose();
        face.dispose();
      }
    }
  };
}
