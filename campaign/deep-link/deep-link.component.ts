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
  selector: 'app-deep-link',
  templateUrl: './deep-link.component.html',
  styleUrls: [
    '../../../../../assets/scss/v2/v2.scss',
    '../../../../../assets/scss/utils/utils.scss',
    './deep-link.component.scss',
  ],
})
export class DeepLinkComponent extends CampaignModalComponent implements OnInit, OnChanges {
  // TODO: Define decorators
  @Input() data: any;
  @Output() hasOpenedCreateDeepLinkFormModalEmitter = new EventEmitter<any>();

  // TODO: Define element
  // TODO: Define constants

  // TODO: Define model

  // TODO: Define var
  campaignId: any
  campaign: any;
  adSpaces: any[] = [];

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

  // TODO: Handle Emitter
  handleIsOpenedCreateDeepLinkFormModalEmitter(
    hasOpenedCreateDeepLinkFormModalEmitter: any
  ) {
    this.hasOpenedCreateDeepLinkFormModalEmitter.emit(hasOpenedCreateDeepLinkFormModalEmitter);
  }

  // TODO: Process
  getData() {
    if (this.data) {
      this.campaignId = this.data.campaignId;
      this.campaign = this.data.campaign;
      this.adSpaces = this.data.adSpaces;
      this.action = this.data.action;
    }
  }

  // TODO: API
}