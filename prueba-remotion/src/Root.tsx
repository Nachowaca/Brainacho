import { Composition } from "remotion";
import { PruebaScene } from "./Composition";
import { PruebaOpus } from "./opus/PruebaOpus";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Prueba"
        component={PruebaScene}
        durationInFrames={270}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="PruebaToma2"
        component={PruebaOpus}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
