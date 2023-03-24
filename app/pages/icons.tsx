import { SymmetryIcon } from '../components/Icons';
import { Symmetry } from '../lib/types';

export default function IconsTestPage() {
  return (
    <div>
      <div>
        Asymmetric: <SymmetryIcon type={Symmetry.None} />
      </div>
      <div>
        Horizontal: <SymmetryIcon type={Symmetry.Horizontal} />
      </div>
      <div>
        Vertical: <SymmetryIcon type={Symmetry.Vertical} />
      </div>
      <div>
        Rotational: <SymmetryIcon type={Symmetry.Rotational} />
      </div>
      <div>
        Diagonal NE/SW: <SymmetryIcon type={Symmetry.DiagonalNESW} />
      </div>
      <div>
        Diagonal NW/SE: <SymmetryIcon type={Symmetry.DiagonalNWSE} />
      </div>
    </div>
  );
}
