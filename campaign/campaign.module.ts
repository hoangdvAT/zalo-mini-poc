import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignV2RoutingModule } from './campaign-routing.module';
import { IndexComponent } from './index/index.component';
import { NgbModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChartistModule } from 'ng-chartist';
import { CommonBasicModule } from '../../common-basic/common-basic.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { QuillModule } from 'ngx-quill';
import { TranslateModule } from '@ngx-translate/core';
import { CampaignModalComponent } from './campaign-modal/campaign-modal.component';
import { SharedModule } from '../../../shared/shared.module';
import { NgxLoadingModule } from 'ngx-loading';
import { RecaptchaModule } from 'ng-recaptcha';
import { CampaignCardModule } from '../../../shared/components/campaign-card/campaign-card.module';
import { CampaignGeneralComponent } from './campaign-general/campaign-general.component';
import { LeadApiComponent } from './lead-api/lead-api.component';
import { DeepLinkComponent } from './deep-link/deep-link.component';
import { CampaignPipeModule } from '../../campaign/pipes/campaign-pipe.module';
import { PaginationNavigatorModule } from 'src/app/shared/components/pagination-navigator/pagination-navigator.module';
import { DeepLinkCoreV2Module } from '../deep-link/deep-link-core.modules';
import { EmbedJsCoreV2Module } from '../embed-js/embed-js-core.modules';
import { EmbedJsComponent } from './embed-js/embed-js.component';
import { ReferralCodeComponent } from './referral-code/referral-code.component';
import { CreativeComponent } from './creative/creative.component';
import { CampaignPipeV2Module } from './pipes/campaign-pipe-v2.module';
import { CreateConversionComponent } from './create-conversion/create-conversion.component';
import { CampaignModalCoreModule } from './campaign-modal-core.module';

@NgModule({
  declarations: [
    IndexComponent,
  ],
  exports: [
  ],
  imports: [
    CommonModule,
    CampaignV2RoutingModule,
    NgbModule,
    NgbPaginationModule,
    FormsModule,
    CampaignModalCoreModule,
    CampaignPipeModule,
    CampaignPipeV2Module,
    ReactiveFormsModule,
    CampaignCardModule,
    DeepLinkCoreV2Module,
    EmbedJsCoreV2Module,
    CommonBasicModule,
    PaginationNavigatorModule,
    NgSelectModule,
    QuillModule,
    TranslateModule,
    SharedModule,
    NgxLoadingModule,
    RecaptchaModule.forRoot()
  ],
  entryComponents: [
    CampaignModalComponent
  ]
})
export class CampaignV2Module {
}
