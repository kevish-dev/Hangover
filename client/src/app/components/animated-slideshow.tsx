import * as React from "react";
import { HTMLMotionProps, MotionConfig, motion } from "motion/react";

interface TextStaggerHoverProps {
  text: string;
  index: number;
}
interface HoverSliderImageProps {
  index: number;
  imageUrl: string;
}
interface HoverSliderContextValue {
  activeSlide: number;
  changeSlide: (index: number) => void;
}

function splitText(text: string) {
  const words = text.split(" ").map((word) => word.concat(" "));
  const characters = words.map((word) => word.split("")).flat(1);
  return { words, characters };
}

const HoverSliderContext = React.createContext<HoverSliderContextValue | undefined>(undefined);

export function useHoverSliderContext() {
  const context = React.useContext(HoverSliderContext);
  if (context === undefined) throw new Error("useHoverSliderContext must be used within HoverSlider");
  return context;
}

export const HoverSlider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  const [activeSlide, setActiveSlide] = React.useState<number>(0);
  const changeSlide = React.useCallback((index: number) => setActiveSlide(index), []);
  return (
    <HoverSliderContext.Provider value={{ activeSlide, changeSlide }}>
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    </HoverSliderContext.Provider>
  );
});
HoverSlider.displayName = "HoverSlider";

export const TextStaggerHover = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & TextStaggerHoverProps
>(({ text, index, className, ...props }, ref) => {
  const { activeSlide, changeSlide } = useHoverSliderContext();
  const { characters } = splitText(text);
  const isActive = activeSlide === index;

  return (
    <span
      ref={ref}
      className={className}
      onMouseEnter={() => changeSlide(index)}
      style={{ display: "inline-block", position: "relative" }}
      {...props}
    >
      {characters.map((char, i) => (
        <span key={`${char}-${i}`} style={{ display: "inline-block", overflow: "hidden", position: "relative" }}>
          <MotionConfig transition={{ delay: i * 0.018, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}>
            <motion.span
              style={{ display: "inline-block" }}
              animate={isActive ? { y: "-110%", opacity: 0.15 } : { y: "0%", opacity: 0.45 }}
            >
              {char === " " ? " " : char}
            </motion.span>
            <motion.span
              style={{ display: "inline-block", position: "absolute", left: 0, top: 0 }}
              initial={{ y: "110%" }}
              animate={isActive ? { y: "0%", opacity: 1 } : { y: "110%", opacity: 0 }}
            >
              {char === " " ? " " : char}
            </motion.span>
          </MotionConfig>
        </span>
      ))}
    </span>
  );
});
TextStaggerHover.displayName = "TextStaggerHover";

export const HoverSliderImageWrap = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, style, ...props }, ref) => (
  <div
    ref={ref}
    className={className}
    style={{ position: "relative", overflow: "hidden", ...style }}
    {...props}
  >
    {React.Children.map(children, (child) => (
      <div style={{ position: "absolute", inset: 0 }}>
        {child}
      </div>
    ))}
  </div>
));
HoverSliderImageWrap.displayName = "HoverSliderImageWrap";

const clipPathVariants = {
  visible: { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
  hidden:  { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)" },
};

export const HoverSliderImage = React.forwardRef<
  HTMLImageElement,
  HTMLMotionProps<"img"> & HoverSliderImageProps
>(({ index, imageUrl, className, ...props }, ref) => {
  const { activeSlide } = useHoverSliderContext();
  return (
    <motion.img
      ref={ref}
      src={imageUrl}
      className={className}
      variants={clipPathVariants}
      animate={activeSlide === index ? "visible" : "hidden"}
      transition={{ ease: [0.33, 1, 0.68, 1], duration: 0.75 }}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
      {...props}
    />
  );
});
HoverSliderImage.displayName = "HoverSliderImage";
