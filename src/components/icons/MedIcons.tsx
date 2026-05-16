import uteroImg from "@/assets/icon-utero.png";
import bisturiImg from "@/assets/icon-bisturi.png";

interface MaskIconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

function MaskIcon({ src, className, size, style }: MaskIconProps & { src: string }) {
  const dim = size ? `${size}px` : undefined;
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        width: dim,
        height: dim,
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        ...style,
      }}
    />
  );
}

export function UteroIcon(props: MaskIconProps) {
  return <MaskIcon src={uteroImg} {...props} />;
}

export function BisturiIcon(props: MaskIconProps) {
  return <MaskIcon src={bisturiImg} {...props} />;
}
