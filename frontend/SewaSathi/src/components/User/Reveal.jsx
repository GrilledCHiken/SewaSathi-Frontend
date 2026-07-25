import { useInView } from "../../hooks/useInView";

const DELAY_CLASSES = {
  0: "",
  1: "delay-100",
  2: "delay-200",
  3: "delay-300",
  4: "delay-[400ms]",
};

function Reveal({ children, className = "", delay = 0, as: Tag = "div", ...rest }) {
  const [ref, inView] = useInView();

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out ${DELAY_CLASSES[delay] ?? ""} ${
        inView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
