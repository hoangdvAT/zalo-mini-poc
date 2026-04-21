import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Md5 } from 'ts-md5/dist/md5';
import { Helpers } from "../../../../shared/helpers/helpers";
import { TranslateService, TranslationChangeEvent } from "@ngx-translate/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { TenantPipe } from "../../../../shared/pipes/tenant.pipe";
import { environment } from "src/environments/environment";
import { AlertService } from "../../../../modules/common/alert.service";
import { CampaignService } from "../../../../modules/campaign/campaign.service";
import { PublisherService } from "../../../../modules/publisher/publisher.service";
import { DeepLinkService } from "../../../../modules/deep-link/deep-link.service";
import { FileService } from "../../../../modules/common/file.service";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { CampaignModalComponent } from "../campaign-modal/campaign-modal.component";
@Component({
  selector: 'app-lead-api',
  templateUrl: './lead-api.component.html',
  styleUrls: [
    '../../../../../assets/scss/v2/v2.scss',
    '../../../../../assets/scss/utils/utils.scss',
    './lead-api.component.scss',
  ],
})
export class LeadApiComponent extends CampaignModalComponent implements OnInit, OnChanges {
  // TODO: Define decorators
  @Input() data: any;
  @Output() leadApiChangeEmitter = new EventEmitter<any>();

  // TODO: Define element
  // TODO: Define constants

  // TODO: Define model

  // TODO: Define var

  // TODO: Define flag

  // TODO: Define reactive form
  frmLeadApi = new FormGroup({
    adSpace: new FormControl('', Validators.required),
    note: new FormControl(''),
    utmSource: new FormControl(''),
    utmCampaign: new FormControl(''),
    utmContent: new FormControl(''),
    utmMedium: new FormControl(''),
    utmTerm: new FormControl(''),
    sub: new FormControl(''),
    sub1: new FormControl(''),
    sub2: new FormControl(''),
    sub3: new FormControl(''),
    sub4: new FormControl(''),
  });
  
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
    this.translate.onLangChange.subscribe((event: TranslationChangeEvent) => {
      
    });

    this.listenOnChangeFrmLeadApi();

    this.getData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.data.currentValue !== changes.data.previousValue) {
      this.data = changes.data.currentValue;
      this.getData();
    }
  }

  // TODO: Event
  listenOnChangeFrmLeadApi() {
    this.frmLeadApi.valueChanges.subscribe(() => {
      this.onChangeFrmLeadApi();
    })
  }

  onChangeFrmLeadApi() {
    const note = this.frmLeadApi.value.note ? '&note=' + encodeURIComponent(this.frmLeadApi.value.note) : '';

    const utm_source = this.frmLeadApi.value.utmSource ? '&utm_source=' + this.frmLeadApi.value.utmSource : '';
    const utm_campaign = this.frmLeadApi.value.utmCampaign ? '&utm_campaign=' + this.frmLeadApi.value.utmCampaign : '';
    const utm_content = this.frmLeadApi.value.utmContent ? '&utm_content=' + this.frmLeadApi.value.utmContent : '';
    const utm_medium = this.frmLeadApi.value.utmMedium ? '&utm_medium=' + this.frmLeadApi.value.utmMedium : '';
    const utm_term = this.frmLeadApi.value.utmTerm ? '&utm_term=' + this.frmLeadApi.value.utmTerm : '';

    const sub = this.frmLeadApi.value.sub ? '&sub=' + this.frmLeadApi.value.sub : '';
    const sub1 = this.frmLeadApi.value.sub1 ? '&sub1=' + this.frmLeadApi.value.sub1 : '';
    const sub2 = this.frmLeadApi.value.sub2 ? '&sub2=' + this.frmLeadApi.value.sub2 : '';
    const sub3 = this.frmLeadApi.value.sub3 ? '&sub3=' + this.frmLeadApi.value.sub3 : '';
    const sub4 = this.frmLeadApi.value.sub4 ? '&sub4=' + this.frmLeadApi.value.sub4 : '';

    this.leadApi = this.serviceUrl + '/lead/store'
      + '?campaign_id=' + this.campaign.id
      + '&ad_space_code=' + this.frmLeadApi.value.adSpace
      + '&token=' + this.token
      + note
      + utm_source + utm_campaign + utm_content + utm_medium + utm_term + sub + sub1 + sub2 + sub3 + sub4;

    this.leadApiChangeEmitter.emit(this.leadApi);
  }

  // Chú ý: Bê sang Embed JS
  adSpaceChange(event) {
    if (event) {
      this.adSpaceDefault = event;
    }
  }

  onCopyLeadApi() {
    this.copyLeadApi();
  }

  // TODO: Handle Emitter
  // TODO: Process
  getData() {
    if (this.data) {
      this.campaign = this.data.campaign;
      this.campaignConfigs = this.data.campaignConfigs;

      this.getToken();
      this.getAdSpacesData();
    }
  }

  getToken() {
    const md5 = new Md5();
    const username = localStorage.getItem('username');
    this.token = md5.appendStr(username).end();
  }

  getAdSpacesData() {
    this.adSpaces = this.data.adSpaces;
    this.adSpaceDefault = this.data.adSpaceDefault;

    if (
      this.adSpaces &&
      this.adSpaceDefault
    ) {
      this.leadApi = `${this.serviceUrl}/lead/store?campaign_id=${this.campaign.id}&ad_space_code=${this.adSpaceDefault.code}&token=${this.token}`;
    }

  }

  copyLeadApi() {
    navigator.clipboard.writeText(this.leadApi)
      .then(() => {
        this.alertService.fireSmall('success', this.translate.instant('Lead Api copied'));
      })
      .catch(err => {
        this.alertService.fireSmall('error', this.translate.instant('Failed to copy lead Api'));
      });
  }

  // TODO: API
  
}