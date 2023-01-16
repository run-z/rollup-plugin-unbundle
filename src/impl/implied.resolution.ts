import { ImpliedResolution } from '../api/implied-resolution.js';
import { Import$Resolution } from './import.resolution.js';

export class Implied$Resolution extends Import$Resolution implements ImpliedResolution {

  override asImpliedResolution(): this {
    return this;
  }

}

export interface Implied$Resolution extends ImpliedResolution {
  asPackageResolution(): undefined;
}
