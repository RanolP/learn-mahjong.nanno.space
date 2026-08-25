import * as THREE from "three";
import { ENTRY_HEIGHT, easeOutExpo, stagger } from "./animation";
import { WINDS, seatAngle } from "./seats";
import { TILE_SIZE } from "./wall";

/**
 * 자리를 정하려고 뽑는 동남서북 패 네 장.
 *
 * 뽑는 장면은 세 박자다. 먼저 네 장을 펼쳐 어떤 바람이 있는지 보여 주고,
 * 엎어서 섞고, 네 사람이 엎어진 채로 한 장씩 가져간다. 섞는 동안 등만 보이므로
 * 어느 패가 어디로 갔는지 따라갈 수 없다 — 그것이 이 장면의 요점이다.
 */

/** 뽑은 패가 놓이는 자리. 패산 바깥, 그 자리 사람 앞이다. */
const RADIUS = 10.6;
/** 그 사람 정면에서 오른쪽으로 비켜 놓는 거리. 손과 겹치지 않게 옆으로 빼 둔다. */
const ASIDE = 2.9;
/** 판 가운데에 늘어놓을 때의 간격. */
const CENTER_PITCH = 3.7;
/** 보여 줄 때 얼마나 크게 하는지. 판 가운데에서 네 바람을 읽을 수 있어야 한다. */
const SHOW_SCALE = 1.7;
/** 섞을 때 패가 도는 작은 원의 반지름. */
const MIX_RADIUS = 2.9;
/** 뽑은 패가 사람마다 차례로 날아가는 데 쓰는 진행도의 비율. */
const SPAN = 0.55;

/**
 * 섞는 동안 네 장이 차례로 옮겨 앉는 자리. 한 줄이 한 번 섞은 결과이고,
 * 줄마다 자리가 크게 흐트러져 어느 패가 어디로 갔는지 눈으로 따라갈 수 없다.
 */
const ROUNDS = [
  [0, 1, 2, 3],
  [2, 0, 3, 1],
  [1, 3, 0, 2],
  [3, 2, 1, 0]
] as const;

/** 네 박자의 경계. 보여 주기, 멈춤, 엎어 깔기, 섞기, 가져가기 순이다. */
const SHOW_END = 0.14;
const HOLD_END = 0.3;
const LAY_END = 0.44;
const MIX_END = 0.78;

/** a 와 b 사이에서 t 가 얼마나 왔는지. 밖이면 0 또는 1 이다. */
function phase(t: number, a: number, b: number) {
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}

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
  place: (pick: number, reveal: number) => void;
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
  const picks = WINDS.map((wind, i) => {
    const face = new THREE.MeshStandardMaterial({
      map: makeFace(wind),
      roughness: 0.6,
      transparent: true
    });
    faces.push(face);
    // 상자 면의 차례는 +X, -X, +Y, -Y, +Z, -Z 다.
    const mesh = new THREE.Mesh(geometry, [ivory, ivory, back, face, ivory, ivory]);
    group.add(mesh);
    const angle = seatAngle(i);
    return {
      mesh,
      /** 펼쳐 놓을 때의 자리와, 섞은 뒤의 자리. */
      shown: (i - 1.5) * CENTER_PITCH,
      seat: new THREE.Vector3(
        Math.sin(angle) * RADIUS + Math.cos(angle) * ASIDE,
        LIFT,
        Math.cos(angle) * RADIUS - Math.sin(angle) * ASIDE
      ),
      // 자기 자리에 놓일 때는 그 사람이 읽을 방향으로 돌아간다.
      turn: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, -angle, 0, "YXZ"))
    };
  });

  const down = new THREE.Quaternion();
  const from = new THREE.Vector3();
  const here = new THREE.Vector3();
  const next = new THREE.Vector3();

  /** 섞을 때 쓰는 원 위의 자리. */
  const mixSpot = (slot: number, out: THREE.Vector3) => {
    const angle = slot * (Math.PI / 2) + Math.PI / 4;
    out.set(Math.sin(angle) * MIX_RADIUS, LIFT, Math.cos(angle) * MIX_RADIUS);
    return out;
  };

  return {
    group,
    /**
     * pick 은 펼쳐 섞어 나눠 가지기까지의 진행도이고, reveal 은 나눠 가진 패를
     * 제 자리에서 뒤집어 보이는 진행도다.
     */
    place(pick: number, reveal: number) {
      group.visible = pick > 0.001;
      const fade = Math.min(1, pick * 8);
      ivory.opacity = fade;
      back.opacity = fade;
      for (const face of faces) face.opacity = fade;

      const rise = phase(pick, 0, SHOW_END);
      const lay = phase(pick, HOLD_END, LAY_END);
      // 섞는 구간을 줄 수만큼 나눠, 한 줄에서 다음 줄로 차례차례 옮겨 앉는다.
      const mix = phase(pick, LAY_END, MIX_END) * (ROUNDS.length - 1);
      const round = Math.min(ROUNDS.length - 2, Math.floor(mix));
      const swap = easeOutExpo(mix - round);
      const taking = phase(pick, MIX_END, 1);

      picks.forEach(({ mesh, shown, seat, turn }, i) => {
        // 처음에는 크게 펼쳐 네 바람을 읽히고, 엎으면서 제 크기로 줄어든다.
        mesh.scale.setScalar(1 + (SHOW_SCALE - 1) * (1 - lay));

        // 엎어 깔면서 한 줄에서 원 위로 옮겨 앉고, 그 위에서 섞인다.
        mixSpot(ROUNDS[round][i], here);
        mixSpot(ROUNDS[round + 1][i], next);
        from.lerpVectors(here, next, swap);
        // 섞이는 동안 살짝 떠올라 서로 스치듯 지나간다.
        from.y += Math.sin(swap * Math.PI) * 1.1;
        from.x += (shown - from.x) * (1 - lay);
        from.z += (0 - from.z) * (1 - lay);
        from.y += (1 - rise) * ENTRY_HEIGHT;

        const taken = stagger(i, WINDS.length, taking, SPAN);
        mesh.position.lerpVectors(from, seat, taken);
        mesh.position.y += Math.sin(taken * Math.PI) * 1.6;

        // 펼쳤을 때는 그림이 위, 엎으면 등이 위, 자기 앞에 놓고 다시 뒤집으면
        // 그 사람이 읽을 방향으로 그림이 위다.
        mesh.quaternion.copy(faceUp).slerp(down, lay);
        if (reveal > 0.001) mesh.quaternion.slerp(turn, easeOutExpo(reveal));
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
