import { useEffect, useRef, type RefObject } from "react";

type LiquidRevealProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  imageUrl?: string;
};

type TrailPoint = {
  x: number;
  y: number;
  timestamp: number;
  width: number;
};

const TRAIL_LIFETIME = 1300;
const BASE_WIDTH = 300;

export default function LiquidReveal({
  containerRef,
  imageUrl = "/landing_page.jpg",
}: LiquidRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const page = containerRef.current;
    const canvas = canvasRef.current;

    if (!page || !canvas) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    const image = new Image();
    image.src = imageUrl;

    const trail: TrailPoint[] = [];

    const pointer = { x: 0, y: 0 };
    const smoothPointer = { x: 0, y: 0 };

    let initialized = false;
    let hovering = false;
    let width = 0;
    let height = 0;
    let animationFrame = 0;

    const resize = () => {
      const bounds = page.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      width = bounds.width;
      height = bounds.height;

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawImageCover = () => {
      if (!image.complete || image.naturalWidth === 0) return;

      const imageRatio = image.naturalWidth / image.naturalHeight;
      const canvasRatio = width / height;

      let drawWidth;
      let drawHeight;
      let drawX;
      let drawY;

      if (imageRatio > canvasRatio) {
        drawHeight = height;
        drawWidth = height * imageRatio;
        drawX = (width - drawWidth) / 2;
        drawY = 0;
      } else {
        drawWidth = width;
        drawHeight = width / imageRatio;
        drawX = 0;
        drawY = (height - drawHeight) / 2;
      }

      context.drawImage(
        image,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      );
    };

    const drawTrail = (now: number) => {
      while (
        trail.length > 0 &&
        now - trail[0].timestamp > TRAIL_LIFETIME
      ) {
        trail.shift();
      }

      if (trail.length === 0) return;

      context.save();
      context.globalCompositeOperation = "destination-out";
      context.lineCap = "round";
      context.lineJoin = "round";

      for (let index = 1; index < trail.length; index++) {
        const previous = trail[index - 1];
        const current = trail[index];

        const age = (now - current.timestamp) / TRAIL_LIFETIME;
        const remaining = Math.max(0, 1 - age);

        context.globalAlpha = remaining ** 1.5;
        context.lineWidth = current.width;

        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(current.x, current.y);
        context.stroke();
      }

      context.restore();
    };

    const animate = (now: number) => {
      if (hovering && initialized) {
        smoothPointer.x +=
          (pointer.x - smoothPointer.x) * 0.22;

        smoothPointer.y +=
          (pointer.y - smoothPointer.y) * 0.22;

        const wobble =
          Math.sin(now * 0.003) * 12 +
          Math.sin(now * 0.007) * 7;

        trail.push({
          x: smoothPointer.x,
          y: smoothPointer.y,
          timestamp: now,
          width: BASE_WIDTH + wobble,
        });
      }

      context.clearRect(0, 0, width, height);

      context.fillStyle = "#171b2b";
      context.fillRect(0, 0, width, height);

      drawTrail(now);

      context.globalCompositeOperation = "destination-over";
      drawImageCover();
      context.globalCompositeOperation = "source-over";

      animationFrame = requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = page.getBoundingClientRect();

      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;

      if (!initialized) {
        smoothPointer.x = pointer.x;
        smoothPointer.y = pointer.y;
        initialized = true;
      }

      hovering = true;
    };

    const handlePointerLeave = () => {
      hovering = false;
      initialized = false;
    };

    resize();

    window.addEventListener("resize", resize);
    page.addEventListener("pointermove", handlePointerMove);
    page.addEventListener("pointerleave", handlePointerLeave);

    animationFrame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      page.removeEventListener("pointermove", handlePointerMove);
      page.removeEventListener("pointerleave", handlePointerLeave);
      cancelAnimationFrame(animationFrame);
    };
  }, [containerRef, imageUrl]);

  return (
    <canvas
      ref={canvasRef}
      className="landing-reveal"
      aria-hidden="true"
    />
  );
}