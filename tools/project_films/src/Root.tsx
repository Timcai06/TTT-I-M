import { Composition } from 'remotion'
import { EduCanvas, EduCanvasSub } from './educanvas/EduCanvas'
import { EduCanvasV1 } from './educanvas/v1/EduCanvasV1'
import { EduCanvasV3, EduCanvasV3Sub, V3_FRAMES } from './educanvas/v3/EduCanvasV3'
import { EduCanvasV32, EduCanvasV32Sub, V32_FRAMES } from './educanvas/v32/EduCanvasV32'
import { SciScope, SciScopeSub } from './sciscope/SciScope'
import { SciScopeV1 } from './sciscope/v1/SciScopeV1'
import { PITCH_SECONDS, Pitch, PitchPreview, PitchSub } from './pitch/Pitch'
import { DURATION, FPS, H, W } from './ui/theme'

export const Root: React.FC = () => (
  <>
    <Composition id="EduCanvas" component={EduCanvas} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="EduCanvas-sub" component={EduCanvasSub} durationInFrames={DURATION * 4} fps={FPS * 4} width={W} height={H} />
    <Composition id="EduCanvas-v3" component={EduCanvasV3} durationInFrames={V3_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="EduCanvas-v3-sub" component={EduCanvasV3Sub} durationInFrames={V3_FRAMES * 4} fps={FPS * 4} width={W} height={H} />
    <Composition id="EduCanvas-v32" component={EduCanvasV32} durationInFrames={V32_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="EduCanvas-v32-sub" component={EduCanvasV32Sub} durationInFrames={V32_FRAMES * 4} fps={FPS * 4} width={W} height={H} />
    <Composition id="EduCanvas-v1" component={EduCanvasV1} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="SciScope" component={SciScope} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="SciScope-sub" component={SciScopeSub} durationInFrames={DURATION * 4} fps={FPS * 4} width={W} height={H} />
    <Composition id="SciScope-v1" component={SciScopeV1} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Pitch" component={Pitch} durationInFrames={PITCH_SECONDS * FPS} fps={FPS} width={W} height={H} />
    <Composition id="Pitch-sub" component={PitchSub} durationInFrames={PITCH_SECONDS * FPS * 4} fps={FPS * 4} width={W} height={H} />
    <Composition id="Pitch-preview" component={PitchPreview} durationInFrames={PITCH_SECONDS * FPS} fps={FPS} width={W} height={H} />
  </>
)
