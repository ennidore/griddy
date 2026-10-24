import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import Tile, { skinStyle } from './Tile.jsx';
import { MIN_WORD_LENGTH, isAdjacent } from '../../lib/game.js';

// Hit radius as a fraction of tile width. Smaller than 0.5 so a diagonal drag
// passes through the gap between tiles without grazing the orthogonal neighbours.
const HIT_RADIUS = 0.38;

const FLASH_STATUS = { ok: 'ok', already_found: 'dup' };

/**
 * 4×4 letter board with drag-to-connect.
 *
 * Pointer Events cover mouse, touch and pen in one code path. The grid captures
 * the pointer on press, hit-tests tile centres on every move (interpolating
 * between samples so fast swipes don't skip tiles), and supports backtracking
 * by dragging onto the previous tile.
 */
export default function Board({ board, size = 4, roundId, disabled, skin, onSubmit, onPathChange }) {
  const gridRef = useRef(null);
  const tileRefs = useRef([]);
  const pathRef = useRef([]);
  const lastPointRef = useRef(null);
  const pointerIdRef = useRef(null);

  const [path, setPath] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [centers, setCenters] = useState([]);
  const [flash, setFlash] = useState(null); // { path, status }
  const shake = useAnimationControls();

  // ---- geometry
  // offset* metrics ignore CSS transforms, so tile pop-in/scale animations
  // never distort hit areas. Coordinates are relative to the grid element.
  const measure = useCallback(() => {
    if (!gridRef.current) return;
    setCenters(
      tileRefs.current.slice(0, board.length).map((el) => ({
        x: el.offsetLeft + el.offsetWidth / 2,
        y: el.offsetTop + el.offsetHeight / 2,
        r: el.offsetWidth * HIT_RADIUS,
      })),
    );
  }, [board.length]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // ---- path helpers
  const setPathBoth = useCallback(
    (next) => {
      pathRef.current = next;
      setPath(next);
      onPathChange?.(next);
    },
    [onPathChange],
  );

  const reset = useCallback(() => {
    pointerIdRef.current = null;
    lastPointRef.current = null;
    setCursor(null);
    setPathBoth([]);
  }, [setPathBoth]);

  // Cancel an in-progress drag when the round ends or the board changes.
  useEffect(() => {
    if (disabled) reset();
  }, [disabled, reset]);
  useEffect(() => {
    reset();
    setFlash(null);
  }, [roundId, reset]);

  const toLocal = (e) => {
    const g = gridRef.current.getBoundingClientRect();
    return { x: e.clientX - g.left, y: e.clientY - g.top };
  };

  const hitTest = ({ x, y }) => centers.findIndex((c) => (x - c.x) ** 2 + (y - c.y) ** 2 <= c.r ** 2);

  const visit = (i) => {
    const cur = pathRef.current;
    const last = cur[cur.length - 1];
    if (i === last) return;
    if (cur.length > 1 && i === cur[cur.length - 2]) return setPathBoth(cur.slice(0, -1)); // backtrack
    if (cur.includes(i) || !isAdjacent(last, i, size)) return;
    setPathBoth([...cur, i]);
  };

  // ---- pointer handlers
  const handlePointerDown = (e) => {
    if (disabled || pointerIdRef.current !== null) return;
    const p = toLocal(e);
    const i = hitTest(p);
    if (i < 0) return;
    e.preventDefault();
    gridRef.current.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    lastPointRef.current = p;
    setCursor(p);
    setFlash(null);
    setPathBoth([i]);
  };

  const handlePointerMove = (e) => {
    if (e.pointerId !== pointerIdRef.current) return;
    const p = toLocal(e);
    const from = lastPointRef.current || p;
    // Sample along the segment at ~1/4 tile steps.
    const stepLen = (centers[0]?.r || 20) / 2;
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / stepLen));
    for (let s = 1; s <= steps; s++) {
      const q = { x: from.x + ((p.x - from.x) * s) / steps, y: from.y + ((p.y - from.y) * s) / steps };
      const i = hitTest(q);
      if (i >= 0) visit(i);
    }
    lastPointRef.current = p;
    setCursor(p);
  };

  const handlePointerUp = async (e) => {
    if (e.pointerId !== pointerIdRef.current) return;
    const submitted = pathRef.current;
    reset();
    if (submitted.length < MIN_WORD_LENGTH) return;

    const res = await onSubmit(submitted);
    const status = FLASH_STATUS[res.ok ? 'ok' : res.reason] || 'bad';
    setFlash({ path: submitted, status, id: Date.now() });
    if (status === 'bad') shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.35 } });
  };

  // Clear the result flash after a moment.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 550);
    return () => clearTimeout(t);
  }, [flash]);

  // ---- render
  const statusOf = (i) => {
    if (path.includes(i)) return 'selected';
    if (flash?.path.includes(i)) return flash.status;
    return 'idle';
  };

  const linePoints = path.map((i) => centers[i]).filter(Boolean);
  if (cursor && linePoints.length) linePoints.push(cursor);
  const strokeWidth = (centers[0]?.r || 30) * 0.55;

  return (
    <motion.div
      animate={shake}
      ref={gridRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={reset}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative grid touch-none gap-2.5 rounded-xl bg-paper-deep p-3 select-none sm:gap-3 sm:p-4 ${
        disabled ? 'opacity-60' : 'cursor-pointer'
      }`}
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, ...skinStyle(skin) }}
    >
      {board.map((letter, i) => (
        <Tile
          key={`${roundId}-${i}`}
          ref={(el) => (tileRefs.current[i] = el)}
          letter={letter}
          index={i}
          status={statusOf(i)}
        />
      ))}

      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        {linePoints.length > 1 && (
          <polyline
            points={linePoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="var(--color-grape)"
            strokeOpacity="0.35"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </motion.div>
  );
}
