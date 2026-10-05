import { Composition } from "remotion";
import { PruebaScene } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Prueba"
      component={PruebaScene}
      durationInFrames={270}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
