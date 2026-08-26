import { createEffect, onCleanup, onMount } from "solid-js";
import * as THREE from "three";
import { createHands } from "./hands";
import { ENTRY_HEIGHT, stagger } from "./animation";
import { WINDS, drawnBy, pickBeats, seatAngle, seatEntry, windAngle } from "./seats";
import {
  DEALT_TILES,
  DEAL_GROUPS,
  HAND_TILES,
  dealGroup,
  dealIndex,
  dealSeat
} from "./deal";
import { createDice } from "./dice";
import { createDealerMark } from "./dealerMark";
import { createBreakMark } from "./breakMark";
import { createPicks } from "./picks";
import {
  STACKS_PER_SIDE,
  TIERS,
  TILE_SIZE,
  TOTAL_TILES,
  WALL_RADIUS,
  type WallSlot,
  type WallState,
  buildOrder,
  wallSlots
} from "./wall";

/**
 * 판을 위에서 비스듬히 내려다본 그림을 그린다. 정사영 카메라를 판의 대각선
 * 위에 두어 아이소메트릭으로 만든다. 원근 카메라와 달리 멀리 있는 패와 가까운
 * 패의 크기가 같아서, 어느 자리의 패산이든 나란히 비교해 읽을 수 있다.
 *
 * three.js 는 SSR 에서 돌 수 없다. 그래서 렌더러를 onMount 안에서만 만들고,
 * onCleanup 도 그 안에 둔다. onCleanup 을 밖에 두면 서버 렌더링 중에도
 * 실행되기 때문이다.
 */
/**
 * 자리 바람 글자를 판 위에 눕혀 놓는다. 글자를 캔버스에 한 번 그려 텍스처로
 * 쓴다. 폰트 파일을 three.js 로 불러오는 방법도 있지만, 글자 네 개를 그리자고
 * 폰트 로더와 그 비동기 처리를 들일 이유가 없다.
 */
function makeWindLabel(text: string) {
  const SIZE = 128;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f4ecd8";
  ctx.font = `bold ${SIZE * 0.8}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, SIZE / 2, SIZE / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 바람이 도는 방향을 가리키는 화살표를 만든다. 글자와 같은 방법으로 캔버스에
 * 한 번 그려 텍스처로 쓴다.
 *
 * 판 위에 눕힌 평면에서는 캔버스의 아래쪽이 월드 +Z, 오른쪽이 월드 +X 다.
 * 東 자리(+Z)에서 南 자리(+X)로 가는 방향이 캔버스에서는 각도가 줄어드는
 * 쪽이라, 반시계 방향으로 호를 긋는다.
 */
function makeRotationArrow() {
  const SIZE = 256;
  const RADIUS = SIZE * 0.35;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const center = SIZE / 2;

  ctx.strokeStyle = "#fbbf24";
  ctx.fillStyle = "#fbbf24";
  ctx.lineWidth = SIZE * 0.055;
  ctx.lineCap = "round";

  // 한 바퀴를 다 긋지 않고 조금 열어 두어야, 시작과 끝이 겹쳐 방향이 흐려지지 않는다.
  const start = Math.PI * 0.55;
  const end = start - Math.PI * 1.65;
  ctx.beginPath();
  ctx.arc(center, center, RADIUS, start, end, true);
  ctx.stroke();

  // 화살촉은 끝점의 접선 방향으로 세운다. 각도가 줄어드는 쪽으로 도는 호의
  // 접선은 (sin θ, -cos θ) 다.
  const tip = { x: center + Math.cos(end) * RADIUS, y: center + Math.sin(end) * RADIUS };
  const dir = { x: Math.sin(end), y: -Math.cos(end) };
  const normal = { x: -dir.y, y: dir.x };
  const HEAD = SIZE * 0.11;
  ctx.beginPath();
  ctx.moveTo(tip.x + dir.x * HEAD, tip.y + dir.y * HEAD);
  ctx.lineTo(tip.x - dir.x * HEAD * 0.4 + normal.x * HEAD * 0.8, tip.y - dir.y * HEAD * 0.4 + normal.y * HEAD * 0.8);
  ctx.lineTo(tip.x - dir.x * HEAD * 0.4 - normal.x * HEAD * 0.8, tip.y - dir.y * HEAD * 0.4 - normal.y * HEAD * 0.8);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 치수를 그릴 때 월드 한 단위에 쓰는 캔버스 픽셀 수. */
const DIM_UNIT = 100;

/**
 * 치수 그림이 덮는 범위. 패산 한 변의 바깥면에 딱 붙여 세울 판이라, 월드 좌표를
 * 그대로 캔버스 좌표로 옮길 수 있게 왼쪽 위 모서리와 크기를 월드 단위로 적는다.
 */
const DIM = { left: -12.6, top: 2, width: 22, height: 5.6 } as const;

/** 패산 한 변의 절반 길이. 치수선의 양 끝이다. */
const WALL_HALF = (STACKS_PER_SIDE * TILE_SIZE.w) / 2;
/** 패산 두 단의 높이. 세로 치수선의 위 끝이다. */
const WALL_TOP = TIERS * TILE_SIZE.h;
/** 치수 판이 서는 자리. 앞쪽 변의 바깥면보다 아주 조금 앞이다. */
const DIM_FACE_Z = WALL_RADIUS + TILE_SIZE.l / 2 + 0.05;

/**
 * 패산 한 변의 길이와 높이를 재는 치수선. 패산 앞면과 같은 평면에 세워서, 눈금이
 * 화면에 보이는 패의 이음매와 그대로 겹치게 한다. 바닥에 눕히면 패의 높이만큼
 * 어긋나 보여서, 재는 것이 어디인지 흐려진다.
 *
 * 가로는 스택마다 눈금 하나씩 17칸, 세로는 단마다 눈금 하나씩 2칸이다.
 */
function makeWallDimensions() {
  const canvas = document.createElement("canvas");
  canvas.width = DIM.width * DIM_UNIT;
  canvas.height = DIM.height * DIM_UNIT;
  const ctx = canvas.getContext("2d")!;
  const cx = (x: number) => (x - DIM.left) * DIM_UNIT;
  const cy = (y: number) => (DIM.top - y) * DIM_UNIT;

  const left = cx(-WALL_HALF);
  const right = cx(WALL_HALF);
  const base = cy(0);
  const top = cy(WALL_TOP);
  const lengthLine = cy(-1.5);
  const heightLine = cx(-WALL_HALF - 1.3);

  ctx.strokeStyle = "#fbbf24";
  ctx.fillStyle = "#fbbf24";
  ctx.lineCap = "round";

  // 치수 보조선. 재는 자리에서 치수선까지 가늘게 이어, 어디를 잰 값인지 보인다.
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.55;
  for (const x of [left, right]) {
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, lengthLine + 30);
    ctx.stroke();
  }
  for (const y of [base, top]) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(heightLine - 30, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const arrow = (x: number, y: number, dx: number, dy: number) => {
    const SIZE = 26;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx * SIZE - dy * SIZE * 0.35, y + dy * SIZE + dx * SIZE * 0.35);
    ctx.lineTo(x + dx * SIZE + dy * SIZE * 0.35, y + dy * SIZE - dx * SIZE * 0.35);
    ctx.closePath();
    ctx.fill();
  };

  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(left, lengthLine);
  ctx.lineTo(right, lengthLine);
  ctx.stroke();
  arrow(left, lengthLine, 1, 0);
  arrow(right, lengthLine, -1, 0);
  for (let i = 0; i <= STACKS_PER_SIDE; i += 1) {
    const x = left + i * TILE_SIZE.w * DIM_UNIT;
    const tick = i === 0 || i === STACKS_PER_SIDE ? 30 : 15;
    ctx.beginPath();
    ctx.moveTo(x, lengthLine - tick);
    ctx.lineTo(x, lengthLine + tick);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(heightLine, base);
  ctx.lineTo(heightLine, top);
  ctx.stroke();
  arrow(heightLine, base, 0, -1);
  arrow(heightLine, top, 0, 1);
  for (let i = 0; i <= TIERS; i += 1) {
    const y = base - i * TILE_SIZE.h * DIM_UNIT;
    const tick = i === 0 || i === TIERS ? 30 : 15;
    ctx.beginPath();
    ctx.moveTo(heightLine - tick, y);
    ctx.lineTo(heightLine + tick, y);
    ctx.stroke();
  }

  ctx.font = `bold ${DIM_UNIT * 1.1}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(`${STACKS_PER_SIDE}개`, (left + right) / 2, lengthLine + DIM_UNIT * 0.95);
  ctx.textAlign = "right";
  ctx.fillText(`${TIERS}층`, heightLine - DIM_UNIT * 0.45, (base + top) / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function TableView(props: {
  state: WallState;
  /** 자리마다 바람 글자와 손을 놓는다. 자리를 설명하는 레슨에서 켠다. */
  seats?: boolean;
  /** 지난 라운드 수. 자리와 손은 그대로 두고 바람 글자만 그만큼 돌린다.
   * 값이 바뀌면 글자와 화살표가 새 값까지 미끄러져 간다. */
  rounds?: number;
  /** 바람이 도는 방향을 판 가운데에 화살표로 그린다. */
  arrow?: boolean;
  /** 네 사람이 자리에 앉은 상태. 끄고 켜면 손과 글자가 바깥에서 들어오고 나간다. */
  seated?: boolean;
  /** 패산이 쌓인 상태. 끄면 쌓은 순서를 거슬러 한 장씩 걷혀 빈 작탁이 된다. */
  built?: boolean;
  /** 패산 한 변의 길이와 높이를 재는 치수선을 앞쪽 변에 세운다. */
  rulers?: boolean;
  /**
   * 왕패 14장을 회색으로 구분해 그린다. 왕패의 자리는 주사위를 굴려 정하므로,
   * 주사위를 아직 설명하지 않은 레슨에서는 꺼 둔다.
   */
  deadWall?: boolean;
  /** 선이 굴린 주사위 두 개. 넘기면 판 가운데에서 굴러 그 눈에 멈춘다. */
  dice?: readonly [number, number];
  /**
   * 끊을 자리를 주사위 눈만큼 세는 표시. 그 사람 오른쪽 끝에서 한 스택씩
   * 1, 2, 3 … 을 짚고, 다 세면 끊는 자리에 금을 긋는다. 세는 수와 어느 변을
   * 쓸지는 state.brokenAt 이 이미 담고 있어 따로 받지 않는다.
   */
  breakCount?: boolean;
  /** 왕패를 남은 패산에서 바깥으로 밀어 떼어 놓는다. */
  split?: boolean;
  /** 네 사람이 배패 13장씩을 패산에서 가져가 자기 앞에 세운다. */
  dealt?: boolean;
  /** 동남서북 패 네 장을 판 가운데에 펼쳐 보이고, 엎어서 섞는다. */
  picks?: boolean;
  /**
   * 네 사람이 차례로 섞인 패를 한 장씩 집어 온다. 한 사람이 집어 오고, 뒤집어
   * 읽고, 그 바람 자리에 앉는 세 박자를 넷이 차례로 되풀이한다.
   */
  picked?: boolean;
  /** 자리 바람 글자를 판에 놓는다. 넘기지 않으면 앉는 것과 함께 나타난다. */
  winds?: boolean;
  /**
   * 친을 세는 장면. from 은 1 을 세는 자리(東 을 0 으로 하고 반시계로 센 번호),
   * steps 는 주사위 눈의 합이다. 주사위가 멈추면 합을 크게 띄우고, 이어서
   * 표시가 자리마다 1, 2, 3 … 을 짚어 가며 steps 에서 멈춘다. crown 은 다 센
   * 자리 위에 東 을 띄울지로, 친을 정하는 장면에서만 켠다.
   */
  count?: { readonly from: number; readonly steps: number; readonly crown?: boolean };
  /** 친 표시패를 spot 이 가리키는 자리 앞에 놓는다. */
  marker?: boolean;
  /**
   * 바로 옆이 아닌 단계에서 건너뛰어 왔다는 표시. 지나오지 않은 단계의 움직임을
   * 다 보여 줄 이유가 없으므로, 움직이는 도중을 그리지 않고 이 단계의 모습으로
   * 곧장 맞춘다.
   */
  instant?: boolean;
  class?: string;
}) {
  let host!: HTMLDivElement;

  onMount(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#14532d");

    // 판 전체가 들어가는 크기. 패산 한 변이 17 이라 대각선이 24 쯤 된다.
    const VIEW = 13;
    const camera = new THREE.OrthographicCamera(-VIEW, VIEW, VIEW, -VIEW, 0.1, 200);
    camera.position.set(1, 1, 1).normalize().multiplyScalar(60);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(12, 24, 8);
    scene.add(sun);

    const geometry = new THREE.BoxGeometry(TILE_SIZE.w * 0.96, TILE_SIZE.h, TILE_SIZE.l * 0.96);
    // 패산의 패는 엎어져 있다. 그림이 바닥을 보고, 위로는 패 등이 올라온다.
    const ivory = new THREE.MeshStandardMaterial({ color: "#f4ecd8", roughness: 0.6 });
    const back = new THREE.MeshStandardMaterial({ color: "#1d4ed8", roughness: 0.5 });
    const faces = [ivory, ivory, back, ivory, ivory, ivory];

    const tiles = new THREE.InstancedMesh(geometry, faces, TOTAL_TILES);
    tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(tiles);

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3(1, 1, 1);
    const position = new THREE.Vector3();
    const liveColor = new THREE.Color("#ffffff");
    const deadColor = new THREE.Color("#8c8c8c");

    // 남은 패의 목록과 색은 상태가 바뀔 때만 다시 정한다. 자리(행렬)는 쌓는
    // 도중에도 매 프레임 달라지므로 아래 그리기 루프가 맡는다.
    let slots: WallSlot[] = [];
    let order: { rank: number[]; total: number[] } = { rank: [], total: [] };
    createEffect(() => {
      slots = wallSlots(props.state);
      order = buildOrder(slots);
      slots.forEach((slot, i) => {
        tiles.setColorAt(i, props.deadWall && slot.kind === "dead" ? deadColor : liveColor);
      });
      tiles.count = slots.length;
      if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
    });

    /** 네 장 한 묶음이 다 내려앉는 데 쓰는 진행도의 비율. 짧게 잡아야 또각또각 쌓인다. */
    const GROUP_SPAN = 0.18;
    /** 배패 한 묶음이 손으로 옮겨가는 데 쓰는 진행도의 비율. */
    const DEAL_SPAN = 0.14;
    /** 왕패를 뗄 때 패산 바깥으로 밀어내는 거리. */
    const SPLIT_GAP = 1.6;
    /**
     * 배패를 세워 두는 자리가 판 중심에서 떨어진 거리. 패산 바깥면(9.2)과
     * 손끝(10.8) 사이에 끼워, 패산에도 손에도 파묻히지 않는다.
     */
    const DEAL_RADIUS = 10.0;
    /** 세운 패끼리의 간격. */
    const DEAL_PITCH = 1.02;
    /** 선의 쯔모패를 배패 13장에서 떼어 놓는 거리. 손에 든 패와 뽑은 패는 다르다. */
    const DRAW_GAP = 0.6;

    // 패를 세우는 회전. 엎어져 있던 패를 일으켜 그림이 그 자리 사람 쪽을 본다.
    const upright = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const wallTurn = new THREE.Quaternion();
    const seatTurn = new THREE.Quaternion();
    const wallSpot = new THREE.Vector3();
    const handSpot = new THREE.Vector3();

    /**
     * 쌓기 진행도를 받아 패를 제자리에 놓는다. 아직 차례가 오지 않은 패는 크기를
     * 0 으로 눌러 감춘다. 인스턴스는 한 머티리얼을 함께 쓰므로 한 장만 투명하게
     * 만들 수 없어서, 감추는 방법이 이것뿐이다.
     */
    const placeTiles = (progress: number, split: number, deal: number) => {
      slots.forEach((slot, i) => {
        // 네 변이 동시에, 한 변 안에서는 네 장 묶음씩 쌓인다. 그래서 시차는
        // 변마다 따로, 묶음 단위로 준다.
        const laid = stagger(order.rank[i], order.total[i], progress, GROUP_SPAN);
        euler.set(0, slot.rotationY, 0);
        wallTurn.setFromEuler(euler);
        // 왕패는 패산 바깥으로 밀어 떼어 놓는다. 변의 바깥 방향이 곧 패를
        // 돌려 놓은 각도라, 그 각도에서 바로 방향을 얻는다.
        const apart = slot.kind === "dead" ? split * SPLIT_GAP : 0;
        wallSpot.set(
          slot.x + Math.sin(slot.rotationY) * apart,
          slot.y + (1 - laid) * ENTRY_HEIGHT,
          slot.z + Math.cos(slot.rotationY) * apart
        );

        // 배패도 네 장 묶음째로 간다. 그래서 시차를 장이 아니라 묶음으로 준다.
        const taken = i < DEALT_TILES ? stagger(dealGroup(i), DEAL_GROUPS, deal, DEAL_SPAN) : 0;
        if (taken > 0) {
          const angle = seatAngle(dealSeat(i));
          const spot = dealIndex(i);
          const along =
            (spot - (HAND_TILES - 1) / 2) * DEAL_PITCH + (spot >= HAND_TILES ? DRAW_GAP : 0);
          handSpot.set(
            Math.sin(angle) * DEAL_RADIUS + Math.cos(angle) * along,
            TILE_SIZE.l / 2,
            Math.cos(angle) * DEAL_RADIUS - Math.sin(angle) * along
          );
          euler.set(0, angle, 0);
          seatTurn.setFromEuler(euler).multiply(upright);
          position.lerpVectors(wallSpot, handSpot, taken);
          // 가는 동안 살짝 떠올라, 패산을 넘어 손 앞으로 건너간다.
          position.y += Math.sin(taken * Math.PI) * 2.2;
          quaternion.copy(wallTurn).slerp(seatTurn, taken);
        } else {
          position.copy(wallSpot);
          quaternion.copy(wallTurn);
        }

        scale.setScalar(laid > 0 ? 1 : 0);
        matrix.compose(position, quaternion, scale);
        tiles.setMatrixAt(i, matrix);
      });
      tiles.instanceMatrix.needsUpdate = true;
    };

    // 바람 글자는 제 자리의 패산 바로 안쪽 바닥에 눕혀 둔다. 글자 윗변이 판
    // 가운데를 향하도록 자리마다 돌려서, 그 자리에 앉은 사람이 자기 글자를
    // 똑바로 읽는다. 실제 판에 놓인 자리 표지와 같은 방향이다.
    const labels: THREE.Mesh[] = [];
    const labelGeometry = new THREE.PlaneGeometry(3.2, 3.2);
    const labelMaterials: THREE.MeshBasicMaterial[] = [];
    // 앞쪽 두 자리의 글자는 패산에 가려지므로, 벽에 바싹 붙이지 않고
    // 한 뼘 안쪽에 놓는다.
    const LABEL_RADIUS = 5.1;
    if (props.seats) {
      // 글자 하나에 메시 하나를 두고, 자리는 라운드 수로 그때그때 정한다.
      // 자리마다 글자를 새로 그리면 글자가 옮겨가는 도중을 그릴 수 없다.
      WINDS.forEach(wind => {
        const material = new THREE.MeshBasicMaterial({
          map: makeWindLabel(wind),
          transparent: true
        });
        labelMaterials.push(material);
        const mesh = new THREE.Mesh(labelGeometry, material);
        scene.add(mesh);
        labels.push(mesh);
      });
    }

    /**
     * 라운드 수와 앉은 정도를 받아 네 글자를 제 자리에 놓는다. rounds 의 중간
     * 값이면 자리 사이에 서고, progress 의 중간 값이면 판 위에 떠 있다.
     * draw 는 풍패를 뽑아 앉는 진행도로, 글자는 그 사람이 자기 패를 읽고 앉을
     * 때 놓인다.
     */
    const placeLabels = (rounds: number, progress: number, draw: number) => {
      labels.forEach((mesh, i) => {
        // 글자는 그 자리에 앉는 사람과 함께 들어온다. 자리 순서와 바람 순서가
        // 같은 처음 배치에서만 앉기 장면이 나오므로, 번호를 그대로 쓴다.
        // 글자는 그 바람을 뽑은 사람이 이 자리로 와서 앉을 때 놓인다.
        const entry = Math.max(seatEntry(i, progress), pickBeats(drawnBy(i), draw).sit);
        const angle = windAngle(i, rounds);
        const height = 0.02 + (1 - entry) * ENTRY_HEIGHT;
        mesh.position.set(Math.sin(angle) * LABEL_RADIUS, height, Math.cos(angle) * LABEL_RADIUS);
        mesh.rotation.set(-Math.PI / 2, 0, angle);
        labelMaterials[i].opacity = entry;
      });
    };

    // 손도 같은 자리 표지다. 글자만 있으면 판이 비어 보여서, 네 사람이 앉아
    // 있다는 것을 손으로 보여 준다.
    const hands = props.seats ? createHands() : undefined;
    if (hands) scene.add(hands.group);

    // 주사위는 판 가운데에 둔다. 굴리는 장면을 켜고 끌 수 있게, 쓰는 곳에서만
    // 만들고 진행도로 나타났다 사라진다.
    // 한 장면 안에서 주사위가 없는 단계부터 시작하는 곳이 있어, 처음 쓰이는
    // 프레임에 만든다.
    let dice: ReturnType<typeof createDice> | undefined;
    /** 지금 보여 주고 있는 눈. 값이 바뀌면 진행도를 0 으로 되돌려 다시 굴린다. */
    let shown: readonly [number, number] = [1, 1];

    const picks = props.picks !== undefined ? createPicks() : undefined;
    if (picks) scene.add(picks.group);

    // 끊을 자리를 세는 표시도 처음 쓰이는 프레임에 만든다.
    let breakMark: ReturnType<typeof createBreakMark> | undefined;

    // 세는 표시도 주사위처럼, 처음 쓰이는 프레임에 만든다. 첫 단계에서는 세는
    // 일도 표시패도 없는 장면이 있어, 마운트 시점의 prop 만 보고 만들 수 없다.
    let mark: ReturnType<typeof createDealerMark> | undefined;

    // 치수선은 앞쪽 변의 앞면과 같은 평면에 세운다. 카메라가 (1,1,1) 쪽에 있어
    // 이 면은 늘 보이고, 눈금이 패의 이음매와 화면에서 그대로 겹친다.
    let dimensions: THREE.Mesh | undefined;
    let dimensionGeometry: THREE.PlaneGeometry | undefined;
    let dimensionMaterial: THREE.MeshBasicMaterial | undefined;
    // 치수선을 쓰는 곳에서는 켜고 끄기를 프레임마다 바꾸므로, 판은 처음에 한 번
    // 만들어 두고 투명도만 오르내린다.
    if (props.rulers !== undefined) {
      dimensionGeometry = new THREE.PlaneGeometry(DIM.width, DIM.height);
      // 치수는 손보다 앞에 그린다. 손은 패산 바깥에 놓여 치수선을 가리는데,
      // 여기서 보여 줄 것은 치수라서 가려지면 그림이 뜻을 잃는다.
      dimensionMaterial = new THREE.MeshBasicMaterial({
        map: makeWallDimensions(),
        transparent: true,
        depthTest: false
      });
      dimensions = new THREE.Mesh(dimensionGeometry, dimensionMaterial);
      dimensions.renderOrder = 1;
      dimensions.visible = props.rulers;
      dimensions.position.set(
        DIM.left + DIM.width / 2,
        DIM.top - DIM.height / 2,
        DIM_FACE_Z
      );
      scene.add(dimensions);
    }

    // 화살표는 자리 글자보다 안쪽에 눕혀, 글자를 가리지 않고 가운데를 돈다.
    let arrow: THREE.Group | undefined;
    let arrowMaterial: THREE.MeshBasicMaterial | undefined;
    let arrowGeometry: THREE.PlaneGeometry | undefined;
    if (props.arrow) {
      arrowGeometry = new THREE.PlaneGeometry(7.4, 7.4);
      arrowMaterial = new THREE.MeshBasicMaterial({
        map: makeRotationArrow(),
        transparent: true
      });
      const mesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
      mesh.position.y = 0.03;
      mesh.rotation.x = -Math.PI / 2;
      // 눕힌 평면을 그대로 돌리면 기울기까지 흐트러진다. 그룹으로 감싸 y 축으로만
      // 돌리면 글자가 도는 것과 같은 방향으로 화살표도 돈다.
      arrow = new THREE.Group();
      arrow.add(mesh);
      scene.add(arrow);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // 캔버스를 인라인 요소로 두면 아래에 글줄 여백이 붙어 상자보다 커진다.
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (w === 0 || h === 0) return;
      const aspect = w / h;
      camera.left = -VIEW * aspect;
      camera.right = VIEW * aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    // 그리기 루프는 Solid 의 반응성 밖에 둔다. 프레임마다 시그널을 건드리면
    // 반응성 그래프가 초당 60번 다시 도는데, 얻는 것이 없다.
    let frame = 0;
    // 지금 그려지고 있는 라운드 수. props.rounds 로 곧장 뛰지 않고 프레임마다
    // 남은 거리의 일부씩 좁혀서, 도착할수록 느려지다 멈춘다.
    let rounds = props.rounds ?? 0;
    let entry = props.seated ? 1 : 0;
    /** 바람 글자가 들어온 정도. 손보다 늦게 놓을 수 있어 따로 센다. */
    let winds = (props.winds ?? props.seated) ? 1 : 0;
    /** 한 프레임에 오르는 앉기 진행도. 넷이 다 앉기까지 1.2 초쯤 걸린다. */
    const ENTRY_SPEED = 1 / 75;
    // 쌓기 진행도. 136 장이 다 놓이기까지 2 초쯤 걸린다.
    let build = props.built ? 1 : 0;
    const BUILD_SPEED = 1 / 120;
    /** 남은 거리의 일부씩 좁힌다. 0.001 보다 가까우면 딱 붙여서 멈춘다. */
    const approach = (current: number, target: number, rate: number) => {
      if (props.instant) return target;
      const gap = target - current;
      return Math.abs(gap) < 0.001 ? target : current + gap * rate;
    };
    /** 0 과 1 사이를 일정한 속도로 오간다. */
    const drift = (current: number, target: number, speed: number) => {
      if (props.instant) return target;
      return Math.min(1, Math.max(0, current + Math.sign(target - current) * speed));
    };
    /** 지금 그려지고 있는 치수선의 진하기. 켜고 끄면 스르르 나타나고 사라진다. */
    let rulers = props.rulers ? 1 : 0;
    /** 주사위가 구른 정도와, 다 쓰고 판 아래로 꺼지는 정도. */
    let rolled = 0;
    let sank = 0;
    /** 꺼지는 데 0.7 초쯤 걸린다. */
    const SINK_SPEED = 1 / 40;
    /** 끊을 자리를 세어 나간 정도와, 그 표시의 진하기. */
    let stacked = 0;
    let breakShown = 0;
    let split = props.split ? 1 : 0;
    let deal = props.dealt ? 1 : 0;
    /** 주사위가 멈추기까지 1.2 초, 배패를 다 가져가기까지 5 초쯤 걸린다. */
    const ROLL_SPEED = 1 / 75;
    const DEAL_SPEED = 1 / 300;
    /**
     * 풍패를 펼쳐 엎어 섞기까지의 정도와, 네 사람이 차례로 집어 읽고 앉기까지의
     * 정도. 섞기와 뽑기가 단계 두 개로 나뉘어 있어 따로 센다.
     */
    let mixed = 0;
    let drawn = 0;
    /** 섞기까지 4 초, 네 사람이 차례로 집어 읽고 앉기까지 5 초쯤 쓴다. */
    const MIX_SPEED = 1 / 240;
    const DRAW_SPEED = 1 / 300;
    /** 눈의 합을 띄운 정도와, 세어 나간 정도. 테두리와 표시패의 진하기. */
    let sumShown = 0;
    let counted = 0;
    let steps = props.count?.steps ?? 1;
    /** 다 센 자리에 東 을 띄울지. 세기가 끝난 뒤에도 마지막 값을 그대로 쓴다. */
    let crown = props.count?.crown ?? true;
    // 세기가 끝나고 표시패만 남는 단계에서도 표시는 마지막에 짚은 자리에 있어야
    // 한다. 그래서 세던 값을 그대로 들고 있는다.
    let from = props.count?.from ?? 0;
    const SUM_SPEED = 1 / 30;
    /** 한 자리를 세는 데 0.6 초쯤 쓴다. 걸음이 많을수록 전체 시간이 길어진다. */
    const countSpeed = () => 1 / (36 * steps);
    let ring = props.count === undefined ? 0 : 1;
    let plaque = props.marker ? 1 : 0;
    const draw = () => {
      // 쌓기도 앉기처럼 일정한 속도로 흐른다. 앞 단계로 돌아가면 진행도가
      // 거꾸로 내려가, 마지막에 놓은 패부터 차례로 걷힌다.
      build = drift(build, props.built ? 1 : 0, BUILD_SPEED);
      split = approach(split, props.split ? 1 : 0, 0.1);
      deal = drift(deal, props.dealt ? 1 : 0, DEAL_SPEED);
      placeTiles(build, split, deal);
      const values = props.dice;
      if (values && !dice) {
        dice = createDice();
        scene.add(dice.group);
      }
      if (values && (values[0] !== shown[0] || values[1] !== shown[1])) {
        shown = values;
        rolled = 0;
      }
      // 굴리기가 끝나면 합을 띄우고, 합이 다 뜨면 세기 시작한다. 세 박자를
      // 겹치지 않게 이어 붙여야 무엇이 무엇을 정했는지가 읽힌다.
      const count = props.count;
      if (count && (count.steps !== steps || count.from !== from)) {
        steps = count.steps;
        from = count.from;
        counted = 0;
      }
      if (count) crown = count.crown ?? true;
      if ((count || props.marker) && !mark) {
        mark = createDealerMark();
        scene.add(mark.group);
      }
      if (dice) {
        // 다음 단계로 넘어가면 주사위는 던진 자리로 되돌아가지 않고 판 아래로
        // 꺼진다. 되감으면 굴린 것을 무르는 그림이 되어, 이야기가 앞으로
        // 나아가는 것과 어긋난다.
        sank = drift(sank, values ? 0 : 1, SINK_SPEED);
        if (values) rolled = drift(rolled, 1, ROLL_SPEED);
        else if (sank >= 1) rolled = 0;
        // 주사위는 지금 굴리는 사람 자리에서 판 가운데로 던져진다.
        dice.roll(rolled, shown, from, sank);
        sumShown = drift(sumShown, values && rolled >= 1 ? 1 : 0, SUM_SPEED);
        dice.showSum(sumShown, shown[0] + shown[1]);
      }
      if (picks) {
        // 뽑기는 섞기가 다 끝난 뒤에 시작한다. 앞 단계로 돌아갈 때는 거꾸로,
        // 네 사람이 패를 판 가운데에 도로 놓고 일어선 뒤에 섞기가 풀린다.
        mixed = drift(mixed, props.picks ? 1 : drawn > 0 ? mixed : 0, MIX_SPEED);
        drawn = drift(drawn, props.picked === true && mixed >= 1 ? 1 : 0, DRAW_SPEED);
        picks.place(mixed, drawn);
      }
      if (mark) {
        counted = drift(counted, (count && sumShown >= 1) || props.marker ? 1 : 0, countSpeed());
        ring = approach(ring, count === undefined ? 0 : 1, 0.12);
        plaque = approach(plaque, props.marker ? 1 : 0, 0.12);
        mark.place(from, steps, counted, ring, plaque, crown);
      }
      // 끊을 자리는 누구의 패산인지를 다 센 다음에 센다. 두 세기가 겹치면 같은
      // 눈을 두 번 쓴다는 것이 읽히지 않는다.
      if (props.breakCount && !breakMark) {
        breakMark = createBreakMark();
        scene.add(breakMark.group);
      }
      if (breakMark) {
        // 변과 스택은 끊은 자리 하나에 다 들어 있다. 변마다 17 스택이라
        // 몫이 변이고 나머지가 오른쪽 끝에서 센 스택 수, 곧 눈의 합이다.
        const side = Math.floor(props.state.brokenAt / STACKS_PER_SIDE);
        const steps = props.state.brokenAt % STACKS_PER_SIDE;
        // 앞 단계에서 자리를 세고 있으면 그것이 끝나기를 기다린다. 세기가
        // 끝난 다음 단계에서는 count 가 없으므로 곧장 센다.
        const seatCounted = count === undefined || counted >= 1;
        stacked = drift(
          stacked,
          props.breakCount && seatCounted ? 1 : 0,
          1 / (30 * Math.max(1, steps))
        );
        breakShown = approach(breakShown, props.breakCount ? 1 : 0, 0.12);
        breakMark.place(side, steps, stacked, breakShown);
      }
      rounds = approach(rounds, props.rounds ?? 0, 0.08);
      // 앉기는 일정한 속도로 흐른다. 자리마다 시차를 두려면 진행도가 고르게
      // 올라가야, 네 사람이 같은 간격으로 하나씩 들어온다.
      entry = drift(entry, props.seated ? 1 : 0, ENTRY_SPEED);
      winds = drift(winds, (props.winds ?? props.seated) ? 1 : 0, ENTRY_SPEED);
      placeLabels(rounds, winds, drawn);
      hands?.place(entry, drawn);
      if (arrow) {
        arrow.rotation.y = rounds * (Math.PI / 2);
        arrowMaterial!.opacity = entry;
      }
      if (dimensions) {
        rulers = approach(rulers, props.rulers ? 1 : 0, 0.12);
        dimensionMaterial!.opacity = rulers;
        dimensions.visible = rulers > 0.01;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    draw();

    // WebGLRenderer.dispose() 는 지오메트리와 머티리얼까지 정리해 주지 않는다.
    // 하나씩 직접 버려야 페이지를 오갈 때 GPU 메모리가 새지 않는다.
    onCleanup(() => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      geometry.dispose();
      labelGeometry.dispose();
      for (const material of labelMaterials) {
        material.map?.dispose();
        material.dispose();
      }
      for (const mesh of labels) scene.remove(mesh);
      if (dimensions) scene.remove(dimensions);
      dimensionGeometry?.dispose();
      dimensionMaterial?.map?.dispose();
      dimensionMaterial?.dispose();
      if (dice) {
        scene.remove(dice.group);
        dice.dispose();
      }
      if (picks) {
        scene.remove(picks.group);
        picks.dispose();
      }
      if (mark) {
        scene.remove(mark.group);
        mark.dispose();
      }
      if (breakMark) {
        scene.remove(breakMark.group);
        breakMark.dispose();
      }
      if (hands) {
        scene.remove(hands.group);
        hands.dispose();
      }
      if (arrow) scene.remove(arrow);
      arrowGeometry?.dispose();
      arrowMaterial?.map?.dispose();
      arrowMaterial?.dispose();
      ivory.dispose();
      back.dispose();
      tiles.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    });
  });

  return <div ref={host} class={props.class ?? "h-[32rem] w-full"} />;
}
