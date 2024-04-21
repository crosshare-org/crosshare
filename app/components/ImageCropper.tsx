/* eslint-disable @next/next/no-img-element */
import { ref, uploadBytes } from 'firebase/storage';
import {
  ChangeEvent,
  ReactEventHandler,
  useCallback,
  useRef,
  useState,
} from 'react';
import ReactImageCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { getStorage } from '../lib/firebaseWrapper';
import { Button } from './Buttons';
import { Overlay } from './Overlay';
import { useSnackbar } from './Snackbar';

function downsample(
  image: HTMLImageElement,
  targetSize: [number, number],
  crop: Crop
) {
  if (!crop.width || !crop.height) {
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
    fullCropHeight
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
          gx_a += weight * (data[pos_x + 3] ?? 0);
          weights_alpha += weight;
          //colors
          if ((data[pos_x + 3] ?? 0) < 255)
            weight = (weight * (data[pos_x + 3] ?? 0)) / 250;
          gx_r += weight * (data[pos_x] ?? 0);
          gx_g += weight * (data[pos_x + 1] ?? 0);
          gx_b += weight * (data[pos_x + 2] ?? 0);
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

function upload(
  storageKey: string,
  image: HTMLImageElement | null,
  targetSize: [number, number],
  crop: Crop | null,
  onComplete: (msg: string) => void
) {
  if (!image || !crop?.width || !crop.height) {
    return;
  }

  const canvas = downsample(image, targetSize, crop);
  if (!canvas) {
    return;
  }

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        onComplete('something went wrong');
        return;
      }
      uploadBytes(ref(getStorage(), storageKey), blob)
        .then(() => {
          onComplete(
            'Pic updated. It can take up to several hours to appear on the site.'
          );
        })
        .catch((e: unknown) => {
          console.error('error uploading image', e);
        });
    },
    'image/jpeg',
    0.85
  );
}

export function ImageCropper(props: {
  isCircle: boolean;
  targetSize: [number, number];
  storageKey: string;
  cancelCrop: () => void;
}) {
  const [upImg, setUpImg] = useState<string>();
  const { showSnackbar } = useSnackbar();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: 'px',
    width: props.targetSize[0],
    height: props.targetSize[1],
    x: 0,
    y: 0,
  });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [minWidth, setMinWidth] = useState(props.targetSize[0]);
  const [disabled, setDisabled] = useState(true);
  const [uploading, setUploading] = useState(false);

  const onSelectFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && e.target.files[0]) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setUpImg(reader.result?.toString());
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onLoad: ReactEventHandler<HTMLImageElement> = useCallback(
    (e) => {
      const img = e.currentTarget;
      if (
        img.naturalWidth < props.targetSize[0] ||
        img.naturalHeight < props.targetSize[1]
      ) {
        setDisabled(true);
        alert(
          `Please use an image at least ${props.targetSize[0]}x${props.targetSize[1]}`
        );
        setUpImg(undefined);
        return;
      }
      setDisabled(false);
      imgRef.current = img;
      const minWidth = (props.targetSize[0] * img.width) / img.naturalWidth;
      setMinWidth(minWidth);
      const crop: Crop = {
        unit: 'px',
        width: minWidth,
        height: (props.targetSize[1] * img.height) / img.naturalHeight,
        x: 0,
        y: 0,
      };
      setCrop(crop);
      setCompletedCrop(crop);
    },
    [props.targetSize]
  );

  return (
    <Overlay closeCallback={props.cancelCrop}>
      <div>
        <input
          disabled={uploading}
          type="file"
          accept="image/*"
          onChange={onSelectFile}
        />
      </div>
      <div className="margin1em0">
        {upImg ? (
          <ReactImageCrop
            aspect={props.targetSize[0] / props.targetSize[1]}
            minWidth={minWidth}
            circularCrop={props.isCircle}
            keepSelection={true}
            crop={crop}
            onChange={(c) => {
              setCrop(c);
            }}
            onComplete={(c) => {
              setCompletedCrop(c);
            }}
          >
            <img alt="Your upload" src={upImg} onLoad={onLoad} />
          </ReactImageCrop>
        ) : (
          ''
        )}
      </div>
      {uploading ? (
        <p>Uploading...</p>
      ) : (
        <Button
          disabled={disabled || !completedCrop?.width || !completedCrop.height}
          onClick={() => {
            setUploading(true);
            upload(
              props.storageKey,
              imgRef.current,
              props.targetSize,
              completedCrop,
              (msg: string) => {
                showSnackbar(msg);
                props.cancelCrop();
              }
            );
          }}
          text="Upload Image"
        />
      )}
    </Overlay>
  );
}
