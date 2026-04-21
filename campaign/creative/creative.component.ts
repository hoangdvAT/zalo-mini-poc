import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { CampaignModalComponent } from "../campaign-modal/campaign-modal.component";
import { CampaignService } from "../../../campaign/campaign.service";
import { PublisherService } from "../../../publisher/publisher.service";
import { DeepLinkService } from "../../../deep-link/deep-link.service";
import { FileService } from "../../../common/file.service";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { AlertService } from "../../../common/alert.service";

@Component({
  selector: 'app-creative',
  templateUrl: './creative.component.html',
  styleUrls: [
    '../../../../../assets/scss/v2/v2.scss',
    '../../../../../assets/scss/utils/utils.scss',
    './creative.component.scss',
  ],
})
export class CreativeComponent extends CampaignModalComponent implements OnInit, OnChanges {
  // TODO: Define decorators
  @Input() data: any;

  // TODO: Define element
  // TODO: Define constants

  // TODO: Define model

  // TODO: Define var
  campaignFiles: any[];

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
    this.checkData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.data && changes.data.currentValue !== changes.data.previousValue) {
      this.data = changes.data.currentValue;
      this.getData();
      this.checkData();
    }
  }

  // TODO: Event
  onDownload(url: any) {
    if (url) {
      window.open(url, '_blank');
    }
  }

  // TODO: Handle Emitter
  // TODO: Process
  getData() {
    if (this.data) {
      this.campaignFiles = this.data.campaignFiles || [];
    }
  }

  checkData() {
    this.campaignFiles.forEach((file: any) => {
      file.extendName = file.file.split('.').pop() || '';
    });
  }

  // TODO: API
}
