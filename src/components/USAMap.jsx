import React, { useEffect, useMemo, useRef, useState } from 'react';

// Module-level SVG cache — persists across route changes so the map loads instantly on return
let _svgCache = null;
let _svgFetchPromise = null;
function fetchSvgOnce() {
  if (_svgCache !== null) return Promise.resolve(_svgCache);
  if (_svgFetchPromise) return _svgFetchPromise;
  _svgFetchPromise = fetch('/us.svg')
    .then((r) => r.text())
    .then((text) => { _svgCache = text; _svgFetchPromise = null; return text; });
  return _svgFetchPromise;
}

// Verified 5-color map: no two adjacent US states share the same index
const STATE_COLOR_INDEX = {
  WA:0, OR:1, CA:2, NV:3, ID:4, MT:1, WY:2, UT:0, AZ:1, NM:3, CO:4,
  ND:0, SD:3, NE:1, KS:3, OK:2, TX:1, MN:2, IA:4, MO:0, AR:4, LA:0,
  MS:2, AL:3, GA:4, FL:2, SC:0, NC:2, TN:1, KY:2, IL:1, IN:3, OH:1,
  WV:3, VA:0, PA:2, NY:3, NJ:0, DE:3, MD:1, DC:2, CT:0, RI:2, MA:1,
  NH:2, VT:0, ME:3, MI:0, WI:3, AK:0, HI:1
};
const UNVISITED_COLORS = ['#c6d8e8','#bddbc4','#e8d8b0','#e0bfc0','#cbbfe0'];

const stateCodeToName = {
  MA: 'Massachusetts', MN: 'Minnesota', MT: 'Montana', ND: 'North Dakota',
  HI: 'Hawaii', ID: 'Idaho', WA: 'Washington', AZ: 'Arizona',
  CA: 'California', CO: 'Colorado', NV: 'Nevada', NM: 'New Mexico',
  OR: 'Oregon', UT: 'Utah', WY: 'Wyoming', AR: 'Arkansas',
  IA: 'Iowa', KS: 'Kansas', MO: 'Missouri', NE: 'Nebraska',
  OK: 'Oklahoma', SD: 'South Dakota', LA: 'Louisiana', TX: 'Texas',
  CT: 'Connecticut', NH: 'New Hampshire', RI: 'Rhode Island', VT: 'Vermont',
  AL: 'Alabama', FL: 'Florida', GA: 'Georgia', MS: 'Mississippi',
  SC: 'South Carolina', IL: 'Illinois', IN: 'Indiana', KY: 'Kentucky',
  NC: 'North Carolina', OH: 'Ohio', TN: 'Tennessee', VA: 'Virginia',
  WI: 'Wisconsin', WV: 'West Virginia', DE: 'Delaware', DC: 'District of Columbia',
  MD: 'Maryland', NJ: 'New Jersey', NY: 'New York', PA: 'Pennsylvania',
  ME: 'Maine', MI: 'Michigan', AK: 'Alaska'
};

const SHAPE_SELECTOR = 'path[id], polygon[id], rect[id], circle[id], ellipse[id]';

const USAMap = ({ states, visitedStates, onStateClick }) => {
  const svgHostRef = useRef(null);
  const viewportRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const [svgMarkup, setSvgMarkup] = useState('');
  const [hoveredCode, setHoveredCode] = useState('');
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const stateMap = useMemo(() => {
    const map = new Map();
    states.forEach((state) => {
      map.set(state.code, state);
    });
    return map;
  }, [states]);

  useEffect(() => {
    let cancelled = false;

    fetchSvgOnce()
      .then((text) => { if (!cancelled) setSvgMarkup(text); })
      .catch(() => { if (!cancelled) setSvgMarkup(''); });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!svgMarkup || !svgHostRef.current) {
      return;
    }

    svgHostRef.current.innerHTML = svgMarkup;
    const svg = svgHostRef.current.querySelector('svg');
    if (!svg) {
      return;
    }

    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const shapes = Array.from(svg.querySelectorAll(SHAPE_SELECTOR));

    const updateShapeColors = () => {
      const visited = new Set(visitedStates);
      shapes.forEach((shape) => {
        const code = (shape.id || '').toUpperCase();
        if (!/^[A-Z]{2}$/.test(code)) {
          return;
        }
        const colorIdx = STATE_COLOR_INDEX[code] ?? 0;
        const isVisited = visited.has(code);
        shape.style.fill = isVisited ? '#9fdcb8' : UNVISITED_COLORS[colorIdx];
        shape.style.stroke = isVisited ? '#4e9e72' : '#ffffff';
        shape.style.strokeWidth = isVisited ? '1.8px' : '1.4px';
        shape.style.cursor = 'pointer';
        shape.style.transition = 'fill 140ms ease';
      });
    };

    const moveTooltip = (event) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      setTooltip({
        x: event.clientX - rect.left + 14,
        y: event.clientY - rect.top - 18
      });
    };

    const onMouseEnter = (event) => {
      const code = (event.currentTarget.id || '').toUpperCase();
      if (!/^[A-Z]{2}$/.test(code)) {
        return;
      }
      setHoveredCode(code);
      moveTooltip(event);
    };

    const onMouseMove = (event) => {
      moveTooltip(event);
    };

    const onMouseLeave = () => {
      setHoveredCode('');
    };

    const onClick = (event) => {
      // Ignore clicks that were actually the end of a drag gesture
      if (dragRef.current.hasDragged) return;
      const code = (event.currentTarget.id || '').toUpperCase();
      if (!/^[A-Z]{2}$/.test(code)) {
        return;
      }

      const state = stateMap.get(code) || { code, name: stateCodeToName[code] || code };
      onStateClick(state);
    };

    shapes.forEach((shape) => {
      shape.addEventListener('mouseenter', onMouseEnter);
      shape.addEventListener('mousemove', onMouseMove);
      shape.addEventListener('mouseleave', onMouseLeave);
      shape.addEventListener('click', onClick);
    });

    updateShapeColors();

    return () => {
      shapes.forEach((shape) => {
        shape.removeEventListener('mouseenter', onMouseEnter);
        shape.removeEventListener('mousemove', onMouseMove);
        shape.removeEventListener('mouseleave', onMouseLeave);
        shape.removeEventListener('click', onClick);
      });
    };
  }, [svgMarkup, visitedStates, onStateClick, stateMap]);

  useEffect(() => {
    const onWindowMouseMove = (event) => {
      if (!dragRef.current.active) {
        return;
      }

      const dx = event.clientX - dragRef.current.startX;
      const dy = event.clientY - dragRef.current.startY;
      // Mark as a drag if moved more than 4px so we can suppress the click event
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragRef.current.hasDragged = true;
      }
      setPan({ x: dragRef.current.originX + dx, y: dragRef.current.originY + dy });
    };

    const onWindowMouseUp = () => {
      dragRef.current.active = false;
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, []);

  const startDrag = (event) => {
    if (event.button !== 0) {
      return;
    }

    dragRef.current = {
      active: true,
      hasDragged: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y
    };
  };

  const onWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.12 : 0.12;
    setZoom((prev) => Math.min(3, Math.max(0.7, Number((prev + delta).toFixed(2)))));
  };

  const zoomIn = () => setZoom((prev) => Math.min(3, Number((prev + 0.2).toFixed(2))));
  const zoomOut = () => setZoom((prev) => Math.max(0.7, Number((prev - 0.2).toFixed(2))));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const hoveredName = stateCodeToName[hoveredCode] || hoveredCode;

  return (
    <div className="usa-map-container">
      <div className="map-zoom-controls" aria-label="Map zoom controls">
        <button type="button" className="zoom-btn" onClick={zoomIn} aria-label="Zoom in">+</button>
        <button type="button" className="zoom-btn" onClick={zoomOut} aria-label="Zoom out">-</button>
        <button type="button" className="zoom-btn reset" onClick={resetView} aria-label="Reset map view">Reset</button>
      </div>

      <div
        ref={viewportRef}
        className="svg-map-viewport"
        onMouseDown={startDrag}
        onWheel={onWheel}
      >
        <div
          className="svg-map-transform"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <div ref={svgHostRef} className="svg-map-host" />
        </div>

        {hoveredCode && (
          <div className="map-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            {hoveredName} ({hoveredCode})
          </div>
        )}
      </div>

      <div className="map-hint">Use map controls or mouse wheel to zoom • Drag to pan • Click any state to log your visit</div>
    </div>
  );
};

export default USAMap;
