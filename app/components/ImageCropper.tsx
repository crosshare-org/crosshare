import React, { useState, useCallback, useRef, ChangeEvent } from 'react';
import ReactCrop from 'react-image-crop';
import { Overlay } from './Overlay';
import { Button } from './Buttons';
import { App } from '../lib/firebaseWrapper';
import { useSnackbar } from './Snackbar';

function downsample(image: HTMLImageElement, targetSize: [number, number], crop: ReactCrop.Crop) {
  if (!crop || !crop.width || !crop.height) {
    return null;
  }
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement('canvas');
  const fullCropWidth = crop.width * scaleX;
  canvas.width = fullCropWidth;
  const fullCropHeight = crop.height * scaleY;
  canvas.height = fullCropHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.drawImage(
    image,
    (crop.x || 0) * scaleX,
    (crop.y || 0) * scaleY,
    fullCropWidth,
    fullCropHeight,
    0,
    0,
    fullCropWidth,
    fullCropHeight,
  );

  const width_source = canvas.width;
  const height_source = canvas.height;
  const width = targetSize[0];
  const height = targetSize[1];

  const ratio_w = width_source / width;
  const ratio_h = height_source / height;
  const ratio_w_half = Math.ceil(ratio_w / 2);
  const ratio_h_half = Math.ceil(ratio_h / 2);

  const img = ctx.getImageData(0, 0, width_source, height_source);
  const img2 = ctx.createImageData(width, height);
  const data = img.data;
  const data2 = img2.data;

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const x2 = (i + j * width) * 4;
      let weight = 0;
      let weights = 0;
      let weights_alpha = 0;
      let gx_r = 0;
      let gx_g = 0;
      let gx_b = 0;
      let gx_a = 0;
      const center_y = (j + 0.5) * ratio_h;
      const yy_start = Math.floor(j * ratio_h);
      const yy_stop = Math.ceil((j + 1) * ratio_h);
      for (let yy = yy_start; yy < yy_stop; yy++) {
        const dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
        const center_x = (i + 0.5) * ratio_w;
        const w0 = dy * dy; //pre-calc part of w
        const xx_start = Math.floor(i * ratio_w);
        const xx_stop = Math.ceil((i + 1) * ratio_w);
        for (let xx = xx_start; xx < xx_stop; xx++) {
          const dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
          const w = Math.sqrt(w0 + dx * dx);
          if (w >= 1) {
            //pixel too far
            continue;
          }
          //hermite filter
          weight = 2 * w * w * w - 3 * w * w + 1;
          const pos_x = 4 * (xx + yy * width_source);
          //alpha
          gx_a += weight * data[pos_x + 3];
          weights_alpha += weight;
          //colors
          if (data[pos_x + 3] < 255)
            weight = weight * data[pos_x + 3] / 250;
          gx_r += weight * data[pos_x];
          gx_g += weight * data[pos_x + 1];
          gx_b += weight * data[pos_x + 2];
          weights += weight;
        }
      }
      data2[x2] = gx_r / weights;
      data2[x2 + 1] = gx_g / weights;
      data2[x2 + 2] = gx_b / weights;
      data2[x2 + 3] = gx_a / weights_alpha;
    }
  }
  //clear and resize canvas
  canvas.width = width;
  canvas.height = height;
  ctx.putImageData(img2, 0, 0);
  return canvas;
}

function upload(storageKey: string, image: HTMLImageElement | null, targetSize: [number, number], crop: ReactCrop.Crop | null, onComplete: (msg: string) => void) {
  if (!image || !crop || !crop.width || !crop.height) {
    return;
  }

  const canvas = downsample(image, targetSize, crop);
  if (!canvas) {
    return;
  }

  canvas.toBlob(
    blob => {
      if (!blob) {
        onComplete('something went wrong');
        return;
      }
      App.storage().ref().child(storageKey).put(blob).then(() => {
        onComplete('Pic updated. It can take up to several hours to appear on the site.');
      });
    },
    'image/jpeg',
    0.85
  );
}

export function ImageCropper(props: { isCircle: boolean, targetSize: [number, number], storageKey: string, cancelCrop: () => void }) {
  const [upImg, setUpImg] = useState<string>();
  const { showSnackbar } = useSnackbar();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<ReactCrop.Crop>({ unit: 'px', width: props.targetSize[0], aspect: props.targetSize[0] / props.targetSize[1] });
  const [completedCrop, setCompletedCrop] = useState<ReactCrop.Crop | null>(null);
  const [minWidth, setMinWidth] = useState(props.targetSize[0]);
  const [disabled, setDisabled] = useState(true);
  const [uploading, setUploading] = useState(false);

  const onSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setUpImg(reader.result ?.toString()));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onLoad = useCallback((img: HTMLImageElement) => {
    if (img.naturalWidth < props.targetSize[0] || img.naturalHeight < props.targetSize[1]) {
      setDisabled(true);
      alert(`Please use an image at least ${props.targetSize[0]}x${props.targetSize[1]}`);
      setUpImg(undefined);
      return;
    }
    setDisabled(false);
    imgRef.current = img;
    setMinWidth(props.targetSize[0] * img.width / img.naturalWidth);
  }, [props.targetSize]);

  return (
    <Overlay closeCallback={props.cancelCrop}>
      <div>
        <input disabled={uploading} type="file" accept="image/*" onChange={onSelectFile} />
      </div>
      <div css={{ margin: '1em 0' }}>
        {upImg ?
          <ReactCrop
            minWidth={minWidth}
            circularCrop={props.isCircle}
            src={upImg}
            keepSelection={true}
            onImageLoaded={onLoad}
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
          />
          : ''}
      </div>
      {uploading ?
        <p>Uploading...</p>
        :
        <Button
          disabled={uploading || disabled || !completedCrop ?.width || !completedCrop ?.height}
          onClick={() => {
            setUploading(true);
            upload(props.storageKey, imgRef.current, props.targetSize, completedCrop, (msg: string) => {
              showSnackbar(msg);
              props.cancelCrop();
            });
          }}
          text="Upload Image"
        />
      }
    </Overlay>
  );
}
