import { NgModule } from '@angular/core';
import { DeviceTypeV2Pipe } from './device-type-v2.pipe';
import { IsShowLeadApiTabPipe } from './is-show-lead-api-tab.pipe';

@NgModule({
  imports: [
  ],
  declarations: [
    DeviceTypeV2Pipe,
    IsShowLeadApiTabPipe,
  ],
  exports: [
    DeviceTypeV2Pipe,
    IsShowLeadApiTabPipe,
  ]
})
export class CampaignPipeV2Module {}
