"use client";

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from "motion/react";

import React, {
  Children,
  cloneElement,
  useEffect,
  useRef,
  useState,
} from "react";

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
};

export type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
  label?: React.ReactNode;
};

function DockItem({
  children,
  className = "",
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  label,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect();

    if (!rect) {
      return Infinity;
    }

    return value - rect.left - rect.width / 2;
  });

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  );

  const size = useSpring(targetSize, spring);

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size,
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`
        relative inline-flex shrink-0 cursor-pointer
        items-center justify-center rounded-full
        border border-white/15
        bg-white/10 text-purple-100
        shadow-[0_0_14px_rgba(192,132,252,0.12)]
        backdrop-blur-md
        transition-[background-color,border-color,box-shadow,color]
        duration-300
        hover:border-purple-300/60
        hover:bg-purple-300/20
        hover:text-white
        hover:shadow-[0_0_22px_rgba(192,132,252,0.45)]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-purple-300/70
        ${className}
      `}
      tabIndex={0}
      role="button"
      aria-label={typeof label === "string" ? label : undefined}
    >
      {Children.map(children, (child) =>
        React.isValidElement(child)
          ? cloneElement(
              child as React.ReactElement<{
                isHovered?: MotionValue<number>;
              }>,
              { isHovered }
            )
          : child
      )}
    </motion.div>
  );
}

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockLabel({
  children,
  className = "",
  isHovered,
}: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) {
      return;
    }

    const unsubscribe = isHovered.on("change", (latest) => {
      setIsVisible(latest === 1);
    });

    return unsubscribe;
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: -8 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className={`
            pointer-events-none absolute -top-8 left-1/2
            whitespace-nowrap rounded-full
            border border-white/15
            bg-[#252337]/85
            px-3 py-1 text-xs text-purple-100
            shadow-[0_0_16px_rgba(192,132,252,0.18)]
            backdrop-blur-md
            ${className}
          `}
          role="tooltip"
          style={{ x: "-50%" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockIcon({
  children,
  className = "",
}: DockIconProps) {
  return (
    <div
      className={`
        flex items-center justify-center
        text-xl
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default function TripsDock({
  items,
  className = "",
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 64,
  baseItemSize = 50,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(event) => {
        mouseX.set(event.clientX);
      }}
      onMouseLeave={() => {
        mouseX.set(Infinity);
      }}
      className={`
        flex w-fit items-end gap-4
        rounded-full
        border border-white/15
        bg-white/[0.07]
        px-4 pb-2
        shadow-[0_8px_32px_rgba(0,0,0,0.28),0_0_28px_rgba(192,132,252,0.12)]
        backdrop-blur-xl
        ${className}
      `}
      style={{ height: panelHeight }}
      role="toolbar"
      aria-label="Application dock"
    >
      {items.map((item, index) => (
        <DockItem
          key={index}
          onClick={item.onClick}
          className={item.className}
          mouseX={mouseX}
          spring={spring}
          distance={distance}
          magnification={magnification}
          baseItemSize={baseItemSize}
          label={item.label}
        >
          <DockIcon>{item.icon}</DockIcon>
          <DockLabel>{item.label}</DockLabel>
        </DockItem>
      ))}
    </motion.div>
  );
}