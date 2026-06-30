import * as React from "react";
import {
  HTMLMotionProps,
  MotionValue,
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "motion/react";

type AnimateT = "left" | "right" | "top" | "bottom" | "z" | "blur" | undefined;

const SPRING_CONFIG = {
  type: "spring",
  stiffness: 100,
  damping: 16,
  mass: 0.75,
  restDelta: 0.005,
  duration: 0.3,
};

const useAnimationVariants = (animate: AnimateT) =>
  React.useMemo(
    () => ({
      hidden: {
        x: animate === "left" ? "-100%" : animate === "right" ? "100%" : 0,
        y: animate === "top" ? "-100%" : animate === "bottom" ? "100%" : 0,
        scale: animate === "z" ? 0 : 1,
        filter: animate === "blur" ? "blur(10px)" : "blur(0px)",
        opacity: 0,
      },
      visible: { x: 0, y: 0, scale: 1, filter: "blur(0px)", opacity: 1 },
    }),
    [animate]
  );

export const ContainerStagger = React.forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      className={className}
      ref={ref}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, ...props.viewport }}
      transition={{ staggerChildren: props.transition?.staggerChildren ?? 0.18, ...props.transition }}
      style={{ position: "relative", ...props.style }}
      {...props}
    >
      {children}
    </motion.div>
  )
);
ContainerStagger.displayName = "ContainerStagger";

interface ContainerAnimatedProps extends HTMLMotionProps<"div"> {
  animation?: AnimateT;
}

export const ContainerAnimated = React.forwardRef<HTMLDivElement, ContainerAnimatedProps>(
  ({ animation, children, className, ...props }, ref) => {
    const variants = useAnimationVariants(animation);
    return (
      <motion.div
        ref={ref}
        variants={variants}
        className={className}
        transition={SPRING_CONFIG}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
ContainerAnimated.displayName = "ContainerAnimated";

interface ContainerScrollValue { scrollYProgress: MotionValue<number> }
const ContainerScrollContext = React.createContext<ContainerScrollValue | undefined>(undefined);

export function useContainerScrollContext() {
  const ctx = React.useContext(ContainerScrollContext);
  if (!ctx) throw new Error("Must be used within ContainerScroll");
  return ctx;
}

interface ContainerScrollProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ContainerScroll = ({ children, className, style, ...props }: ContainerScrollProps) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: scrollRef });
  return (
    <ContainerScrollContext.Provider value={{ scrollYProgress }}>
      <section
        ref={scrollRef}
        className={className}
        style={{ minHeight: "130vh", width: "100%", paddingBottom: "28%", paddingTop: "2rem", ...style, position: "relative" }}
        {...props}
      >
        {children}
      </section>
    </ContainerScrollContext.Provider>
  );
};
ContainerScroll.displayName = "ContainerScroll";

interface ContainerInsetProps extends HTMLMotionProps<"div"> {
  translateYRange?: [string, string];
  insetYRange?: [number, number];
  insetXRange?: [number, number];
  roundednessRange?: [number, number];
}

export const ContainerInset = React.forwardRef<HTMLDivElement, ContainerInsetProps>(
  (
    {
      translateYRange = ["-25%", "50%"],
      insetYRange = [35, 0],
      insetXRange = [38, 0],
      roundednessRange = [999, 12],
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const { scrollYProgress } = useContainerScrollContext();
    const y = useTransform(scrollYProgress, [0, 1], translateYRange);
    const insetY = useTransform(scrollYProgress, [0, 1], insetYRange);
    const insetX = useTransform(scrollYProgress, [0, 1], insetXRange);
    const roundedness = useTransform(scrollYProgress, [0, 1], roundednessRange);
    const clipPath = useMotionTemplate`inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${roundedness}px)`;
    return (
      <motion.div
        ref={ref}
        className={className}
        style={{ y, clipPath, overflow: "hidden", transformOrigin: "top", ...style }}
        transition={SPRING_CONFIG}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
ContainerInset.displayName = "ContainerInset";
