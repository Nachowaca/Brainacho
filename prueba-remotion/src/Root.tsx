import { Composition } from "remotion";
import { PruebaScene } from "./Composition";
import { PruebaOpus } from "./opus/PruebaOpus";
import { IntroPlay } from "./intro/IntroPlay";

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
      <Composition
        id="IntroPlay"
        component={IntroPlay}
        durationInFrames={180}
        fps={30}
        width={1024}
        height={512}
        defaultProps={{ musicSrc: "intro-music-cine.wav", sfxSrc: "intro-sfx.wav" }}
      />
      <Composition
        id="IntroPlayFX"
        component={IntroPlay}
        durationInFrames={240}
        fps={30}
        width={1024}
        height={512}
        defaultProps={{ musicSrc: "", sfxSrc: "intro-fx.wav" }}
      />
    </>
  );
};
