import * as THREE from "three";
import { ENTRY_HEIGHT } from "./animation";
import { DRAWN, WINDS, pickBeats, pickPathAngle, seatEntry, standAside } from "./seats";

/**
 * 자리마다 손 한 쌍을 판 위에 올려 둔다. 누가 어디에 앉는지 글자만으로는 잘
 * 읽히지 않아서, 사람이 앉은 쪽을 손으로 표시한다.
 *
 * 손은 상자 하나와 캡슐 다섯 개로 그 자리에서 만든다. 내려받은 모델을 쓰면
 * GLTFLoader 와 public 자산, 그리고 저작자 표시가 따라오는데, 아이소메트릭으로
 * 멀리서 본 이 크기에서는 손가락 다섯 개 붙은 손 모양이면 충분하다.
 */

/**
 * 손이 판 중심에서 떨어진 거리. 손끝이 손 위치보다 1.5 쯤 안쪽으로 나오므로,
 * 패산 바깥면(중심에서 9.2)에서 손끝까지 패 한 장 반의 간격이 남는다.
 */
const HAND_RADIUS = 12.3;

/**
 * 사람마다 다른 손 색. 자리가 아니라 사람에 붙는 색이라, 자리를 옮겨 앉아도
 * 같은 색이 따라간다. 실제 피부색 네 가지를 밝은 쪽에서 짙은 쪽으로 늘어놓아,
 * 원색으로 칠하지 않고도 초록 판 위에서 넷이 서로 구별된다.
 */
const PERSON_COLORS = ["#f6d5b8", "#dda06b", "#a9663c", "#6d3f26"] as const;
/** 한 자리에서 두 손이 좌우로 벌어진 거리. */
const HAND_SPREAD = 2.1;
/**
 * 풍패를 집으려고 판 가운데로 뻗는 거리. 가장 깊이 들어갔을 때 손끝이 판
 * 가운데에 모인 패와 만나는 자리다.
 */
const REACH = 5.2;

const PALM = { w: 1.45, h: 0.28, l: 1.3 } as const;
const FINGER_RADIUS = 0.15;

/** 손가락의 좌우 위치와 길이. 검지에서 새끼로 갈수록 짧아진다. */
const FINGERS = [
  { x: -0.5, length: 0.62 },
  { x: -0.17, length: 0.74 },
  { x: 0.17, length: 0.66 },
  { x: 0.48, length: 0.46 }
] as const;

/**
 * 손 하나를 만든다. 손가락은 +Z 를 향하고, 손등이 위를 본다.
 * handedness 는 엄지가 뻗는 쪽으로, 왼손은 +1, 오른손은 -1 이다.
 * 두 손 모두 엄지가 자기 자리 가운데를 향하도록 손바닥을 엎은 모습이다.
 */
function makeHand(
  handedness: 1 | -1,
  palm: THREE.BufferGeometry,
  fingers: readonly THREE.BufferGeometry[],
  thumb: THREE.BufferGeometry,
  material: THREE.Material
) {
  const hand = new THREE.Group();

  const palmMesh = new THREE.Mesh(palm, material);
  palmMesh.position.y = PALM.h / 2;
  hand.add(palmMesh);

  FINGERS.forEach((finger, i) => {
    const mesh = new THREE.Mesh(fingers[i], material);
    // 캡슐은 +Y 로 서 있다. x 로 90도 눕히면 +Z 를 향한다.
    mesh.rotation.x = Math.PI / 2;
    // 손바닥 앞모서리에 살짝 겹쳐 붙여, 이은 자리가 벌어지지 않게 한다.
    mesh.position.set(
      finger.x,
      PALM.h / 2,
      PALM.l / 2 - 0.1 + (finger.length + FINGER_RADIUS * 2) / 2
    );
    hand.add(mesh);
  });

  // 엄지는 옆으로 벌어진다. z 로 먼저 돌린 뒤 x 로 눕히면 바닥에 붙은 채
  // 옆을 향한다(three.js 의 XYZ 오일러는 Rx·Ry·Rz 순으로 곱해진다).
  const SPLAY = 0.85;
  const thumbMesh = new THREE.Mesh(thumb, material);
  thumbMesh.rotation.set(Math.PI / 2, 0, -handedness * SPLAY);
  const half = (0.5 + FINGER_RADIUS * 2) / 2;
  thumbMesh.position.set(
    handedness * (0.68 + Math.sin(SPLAY) * half),
    PALM.h / 2,
    0.1 + Math.cos(SPLAY) * half
  );
  hand.add(thumbMesh);

  return hand;
}

/**
 * 네 자리의 손을 한 덩어리로 만든다. place 로 앉은 정도를 정하고, dispose 로
 * 지오메트리까지 함께 버린다.
 */
export function createHands(): {
  group: THREE.Group;
  place: (entry: number, draw: number) => void;
  dispose: () => void;
} {
  const palm = new THREE.BoxGeometry(PALM.w, PALM.h, PALM.l);
  const fingers = FINGERS.map(f => new THREE.CapsuleGeometry(FINGER_RADIUS, f.length, 4, 10));
  const thumb = new THREE.CapsuleGeometry(FINGER_RADIUS, 0.5, 4, 10);
  const materials = PERSON_COLORS.map(
    color => new THREE.MeshStandardMaterial({ color, roughness: 0.85, transparent: true })
  );

  const group = new THREE.Group();
  // 손 한 쌍이 사람 하나다. 자리가 아니라 사람에 매어 두어야, 뽑은 바람에 따라
  // 자리를 옮겨 앉는 것을 그릴 수 있다.
  const people = WINDS.map((_, person) => {
    const node = new THREE.Group();
    for (const offset of [-HAND_SPREAD / 2, HAND_SPREAD / 2]) {
      const handedness = offset < 0 ? 1 : -1;
      const hand = makeHand(handedness, palm, fingers, thumb, materials[person]);
      hand.position.x = offset;
      node.add(hand);
    }
    group.add(node);
    return { node, person, seat: DRAWN[person] };
  });

  return {
    group,
    /**
     * progress 는 그냥 앉은 정도다. 0 이면 넷 다 판 위에 떠 있고, 1 이면 넷 다
     * 판에 손을 올린 자리다. 그 사이에서는 동, 남, 서, 북 순서대로 내려앉는다.
     *
     * draw 는 풍패를 뽑아 앉는 정도다. 자기 차례가 오면 손이 판 위에 떠서
     * 나타나 가운데로 뻗어 패를 집어 오고, 그 패를 읽고 나서야 자리에 내려앉는다.
     * 두 진행도 중 더 나아간 쪽을 쓰므로, 뽑는 장면이 없는 그림은 앞의 것만으로
     * 움직인다.
     */
    place(progress: number, draw: number) {
      people.forEach(({ node, person, seat }) => {
        const seated = seatEntry(seat, progress);
        const beats = pickBeats(person, draw);
        // 손을 뻗기 시작하는 순간에는 이미 다 보여야 한다. 그래서 나타나는
        // 정도는 집기 진행도보다 훨씬 빨리 올라간다.
        materials[person].opacity = Math.max(seated, Math.min(1, beats.take * 8));
        // 읽고 나서야 자기 자리를 알므로, 그때 서 있던 줄을 떠나 그 자리로 간다.
        const settled = Math.max(seated, beats.sit);
        const angle = pickPathAngle(person, settled);
        const aside = standAside(person, settled);
        const radius = HAND_RADIUS - Math.sin(beats.take * Math.PI) * REACH;
        node.position.set(
          Math.sin(angle) * radius + Math.cos(angle) * aside,
          (1 - settled) * ENTRY_HEIGHT,
          Math.cos(angle) * radius - Math.sin(angle) * aside
        );
        // 반 바퀴 더 돌려, 손가락이 판 바깥이 아니라 판 가운데를 향하게 한다.
        node.rotation.y = angle + Math.PI;
      });
    },
    dispose() {
      palm.dispose();
      for (const finger of fingers) finger.dispose();
      thumb.dispose();
      for (const material of materials) material.dispose();
    }
  };
}
