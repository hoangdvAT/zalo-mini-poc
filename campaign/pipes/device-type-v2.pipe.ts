import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'deviceTypeV2',
})
export class DeviceTypeV2Pipe implements PipeTransform {

  transform(deviceId: number | string, data: any): any {
    if (!deviceId || (data && !data.deviceType)) {
      return {};
    }

    const id = String(deviceId);
    if (data.deviceType[id]) {
      return data.deviceType[id];
    }
    return {};
  }

}
