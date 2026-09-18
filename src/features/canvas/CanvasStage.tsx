import { useCanvasRefs, useEditorState } from '../../state/EditorContext'
import { ImageDropzone } from '../imageLoad/ImageDropzone'
import { CropOverlay } from '../crop/CropOverlay'
import { RotateTool } from '../transform/RotateTool'
import { SelectionTool } from '../selection/SelectionTool'
import { BucketFillTool } from '../bucketFill/BucketFillTool'
import { BrushTool } from '../brush/BrushTool'
import { ColorPickerTool } from '../colorPicker/ColorPickerTool'
import { BackgroundRemovalTool } from '../backgroundRemoval/BackgroundRemovalTool'
import { ColorAdjustTool } from '../colorAdjust/ColorAdjustTool'
import { WatermarkTool } from '../watermark/WatermarkTool'

export function CanvasStage() {
  const { imageWidth, imageHeight, activeTool } = useEditorState()
  const { baseCanvasRef, overlayCanvasRef } = useCanvasRefs()
  const hasImage = imageWidth !== null && imageHeight !== null
  const showSidebar = hasImage && activeTool !== 'none'

  return (
    <div className="canvas-stage">
      {!hasImage && <ImageDropzone />}
      <div className="canvas-stage__column" hidden={!hasImage}>
        <div className="canvas-stage__layers">
          <canvas ref={baseCanvasRef} className="canvas-stage__base" />
          <canvas ref={overlayCanvasRef} className="canvas-stage__overlay" />
        </div>
      </div>
      {showSidebar && (
        <aside className="canvas-stage__sidebar" aria-label="Tool options">
          {activeTool === 'crop' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Crop</h2>
              <CropOverlay />
            </>
          )}
          {activeTool === 'rotate' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Rotate & Flip</h2>
              <RotateTool />
            </>
          )}
          {activeTool === 'selection' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Selection</h2>
              <SelectionTool />
            </>
          )}
          {activeTool === 'bucketFill' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Bucket Fill</h2>
              <BucketFillTool />
            </>
          )}
          {activeTool === 'brush' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Brush</h2>
              <BrushTool />
            </>
          )}
          {activeTool === 'colorPicker' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Color Picker</h2>
              <ColorPickerTool />
            </>
          )}
          {activeTool === 'backgroundRemoval' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Remove Background</h2>
              <BackgroundRemovalTool />
            </>
          )}
          {activeTool === 'colorAdjust' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Color Adjust</h2>
              <ColorAdjustTool />
            </>
          )}
          {activeTool === 'watermark' && (
            <>
              <h2 className="canvas-stage__sidebar-title">Watermark</h2>
              <WatermarkTool />
            </>
          )}
        </aside>
      )}
    </div>
  )
}
