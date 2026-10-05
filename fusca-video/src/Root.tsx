import { Composition } from "remotion";
import { FuscaScene } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Fusca"
      component={FuscaScene}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        title: "FUSCA",
        subtitle: "VOLKSWAGEN · TYPE 1",
        carColor: "#4fb8b0",
        backgroundColor: "#e8913a",
      }}
    />
  );
};
