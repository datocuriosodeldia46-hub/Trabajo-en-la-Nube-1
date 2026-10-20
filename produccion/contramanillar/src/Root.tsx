import {Composition} from 'remotion';
import {Contramanillar, DURACION} from './moto/Contramanillar';
export const Root = () => (
  <Composition id="Contramanillar" component={Contramanillar} durationInFrames={Math.round(DURACION * 30)} fps={30} width={1080} height={1920} />
);
