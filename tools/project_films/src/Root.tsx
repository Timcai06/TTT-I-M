import { Composition } from 'remotion'
import { EduCanvas, EduCanvasSub } from './educanvas/EduCanvas'
import { EduCanvasV1 } from './educanvas/v1/EduCanvasV1'
import { SciScope, SciScopeSub } from './sciscope/SciScope'
import { SciScopeV1 } from './sciscope/v1/SciScopeV1'
import { DURATION, FPS, H, W } from './ui/theme'

export const Root: React.FC = () => (
  <>
    <Composition id="EduCanvas" component={EduCanvas} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="EduCanvas-sub" component={EduCanvasSub} durationInFrames={DURATION * 4} fps={FPS * 4} width={W} height={H} />
    <Composition id="EduCanvas-v1" component={EduCanvasV1} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="SciScope" component={SciScope} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="SciScope-sub" component={SciScopeSub} durationInFrames={DURATION * 4} fps={FPS * 4} width={W} height={H} />
    <Composition id="SciScope-v1" component={SciScopeV1} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
  </>
)
