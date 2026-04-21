import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Helpers } from "../../../../shared/helpers/helpers";
import { CLICK_TYPE } from "../constants/campaign-config.constant";
import { TranslateService, TranslationChangeEvent } from "@ngx-translate/core";
import { CampaignModalComponent } from "../campaign-modal/campaign-modal.component";
import { CampaignService } from "../../../campaign/campaign.service";
import { PublisherService } from "../../../publisher/publisher.service";
import { DeepLinkService } from "../../../deep-link/deep-link.service";
import { FileService } from "../../../common/file.service";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { AlertService } from "../../../common/alert.service";
@Component({
  selector: 'app-referral-code',
  templateUrl: './referral-code.component.html',
  styleUrls: [
    '../../../../../assets/scss/v2/v2.scss',
    '../../../../../assets/scss/utils/utils.scss',
    './referral-code.component.scss',
  ],
})
export class ReferralCodeComponent extends CampaignModalComponent implements OnInit, OnChanges {
  // TODO: Define decorators
  @Input() data: any;

  // TODO: Define element
  // TODO: Define constants

  // TODO: Define model

  // TODO: Define var
  publisherRefCodes: any

  // TODO: Define flag

  // TODO: Define reactive form
  // TODO: Define icon
  // TODO: Constructor
  constructor(
    protected campaignService: CampaignService,
    protected publisherService: PublisherService,
    protected deepLinkService: DeepLinkService,
    
    protected alertService: AlertService,
    protected translate: TranslateService,
    protected fileService: FileService,
    protected activeModal: NgbActiveModal,
    protected route: ActivatedRoute,
    protected cdr: ChangeDetectorRef,
  ) {
    super(
      campaignService,
      publisherService,
      deepLinkService,
      alertService,
      translate,
      fileService,
      activeModal,
      route,
      cdr,
    )
  }
  
  // TODO: Life cycler
  ngOnInit(): void {
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.data.currentValue !== changes.data.previousValue) {
      this.data = changes.data.currentValue;
      this.getData();
    }
  }

  // TODO: Event
  onCopy(refCode: string) {
    this.copyToClipboard(refCode);
  }

  // TODO: Handle Emitter
  // TODO: Process
  getData() {
    if (this.data) {
      this.publisherRefCodes = this.data.publisherRefCodes;
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    .then(() => {
      this.alertService.fireSmall('success', this.translate.instant('Referral Code copied'));
    })
    .catch(err => {
      this.alertService.fireSmall('error', this.translate.instant('Failed to copy referral code'));
    });
  }

  // TODO: API
}