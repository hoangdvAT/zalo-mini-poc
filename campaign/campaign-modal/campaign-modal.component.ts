import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { CampaignService } from "../../../campaign/campaign.service";
import { DeepLinkService } from '../../../deep-link/deep-link.service';
import { PublisherService } from "../../../publisher/publisher.service";
import { TenantPipe } from "../../../../shared/pipes/tenant.pipe";
import { environment } from "../../../../../environments/environment";
import { FileService } from "../../../common/file.service";
import { Helpers } from "../../../../shared/helpers/helpers";
import { TranslateService } from "@ngx-translate/core";
import { AlertService } from "../../../../modules/common/alert.service";
import { ngxLoadingAnimationTypes } from "ngx-loading";
@Component({
  selector: 'app-campaign-modal',
  templateUrl: './campaign-modal.component.html',
  styleUrls: [
    './campaign-modal.component.scss',
    '../../../../../assets/scss/v2/v2.scss',
    '../../../../../assets/scss/utils/utils.scss',
  ],
  host: {class: "h-100"},
})
export class CampaignModalComponent implements OnInit, OnChanges {
  // TODO: Define decorators
  @Input() data: any;

  // TODO: Define element
  // TODO: Define constants
  public ngxLoadingAnimationTypes = ngxLoadingAnimationTypes;
  
  NAV_CODES = {
    GENERAL_INFORMATION: "GENERAL_INFORMATION",
    LEAD_API: "LEAD_API",
    DEEP_LINK: "DEEP_LINK",
    EMBED_JS: "EMBED_JS",
    CREATE_ORDER: "CREATE_ORDER",
    REFERRAL_CODE: "REFERRAL_CODE",
    CREATIVE_CODE: "CREATIVE_CODE",
  }

  // TODO: Define model
  campaign: any = {};
  adSpaces: any[] = [];

  // TODO: Define var
  navItems: any[] = [
    {
      code: "GENERAL_INFORMATION",
      name: "General Information",
      isActive: true,
    },
    {
      code: "LEAD_API",
      name: "Lead API",
      isActive: false,
    },
    {
      code: "DEEP_LINK",
      name: "Deep Link",
      isActive: false,
    },
    {
      code: "EMBED_JS",
      name: "Embed JS",
      isActive: false,
    },
    {
      code: "CREATE_ORDER",
      name: "Create Order",
      isActive: false,
    },
    {
      code: "REFERRAL_CODE",
      name: "Referral Code",
      isActive: false,
    },
    {
      code: "CREATIVE_CODE",
      name: "Creative",
      isActive: false,
    },
  ]

  navItemActive: any = this.navItems[0];

  navCode: string;
  action: string;

  campaignConfigs: any;

  contractCount: any;

  contractStatus = {
    pending: 0,
    activated: 0,
    rejected: 0,
    in_active: 0,
    paused: 0,
    lock: 0
  };

  // START: Lead API
  /** urlApi */
  leadApi = '';
  serviceUrl = TenantPipe.prototype.transform(environment.service_url) + '/api/v1';
  token: any;
  code: any;
  d2cJS: any;
  advCode: any;

  /** leadAPI */
  linkAPI = this.serviceUrl + '/lead/store';
  adSpaceDefault = {
    id: '',
    code: ''
  };
  // END: Lead API

  // START: Chưa rõ
  publisherRefCodes: any;
  campaignFiles = [];

  id: any;

  math = Math;

  showCreative = false;

  showEmbed = false;

  leadAPI = this.serviceUrl + '/lead/store';

  urlApi = '';

  lang = 'en';

  captchaToken: any;

  captchaKey = environment.google_captcha_key;

  errors = {
    name: {
      required: 'The full name field is required',
      maxlength: 'The full name may not be greater than 100 characters',
      minlength: 'The full name must be at least 2 characters',
      pattern: 'There is no white space at the start or at the end'
    },
    phone: {
      required: 'The phone field is required',
      pattern: 'The phone format is invalid'
    },
    quantity: {
      max: 'The quantity of applications cannot be greater than 50',
      min: 'The quantity of applications must not be less than 1',
    },
    note: {
      maxlength: 'The last product may not be greater than 500 characters'
    },
    address: {
      required: 'The full address field is required',
      maxlength: 'The last name may not be greater than 200 characters'
    }
  };

  fails: any;
  // END: Chưa rõ

  // TODO: Define flag
  isLoadFullCampaignInfo: boolean = false;
  isLoading: boolean = false;

  hasActivatedDeeplinkNav: {[key: string]: boolean} = {};
  hasOpenedCreateDeepLinkFormModal: boolean = false;

  ableShowContainer: boolean = false;

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
    
  }
  
  // TODO: Life cycler
  ngOnInit(): void {
    this.getData();
    if (this.campaign && this.campaign.id) {
      this.getCampaignById(this.campaign.id);
      this.getAdSpaceById(this.campaign.id);
      this.getPublisherCampaignContract(this.campaign.id);
    } else if (this.data && this.data.isOpenedOtherPage) {
      // this.loadingComplete.emit();
      this.ableShowContainer = true;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.data && changes.data.currentValue !== changes.data.previousValue) {
      this.data = changes.data.currentValue;
      this.getData();
      if (this.campaign && this.campaign.id) {
        this.getCampaignById(this.campaign.id);
        this.getAdSpaceById(this.campaign.id);
        this.getPublisherCampaignContract(this.campaign.id);
      } else if (this.data && this.data.isOpenedOtherPage) {
        this.ableShowContainer = true;
      }
    }
  }

  // TODO: Event
  onDismiss() {
    this.activeModal.dismiss();
  }

  // TODO: Handle Emitter
  handleLeadApiChangeEmitterFromAppLeadApi($event: any) {
    this.leadApi = $event;
  }

  handleIsOpenedCreateDeepLinkFormModalEmitter(
    hasOpenedCreateDeepLinkFormModalEmitter: any
  ) {
    this.hasOpenedCreateDeepLinkFormModal = hasOpenedCreateDeepLinkFormModalEmitter;
  }

  // TODO: Process
  getData() {
    if (this.data) {
      this.campaign = this.data.campaign;
      this.campaignConfigs = this.data.campaignConfigs;
      this.navCode = this.data.navCode;
      this.action = this.data.action;

      if (this.data.isOpenedOtherPage && !this.campaignConfigs) {
        this.getCampaignConfigs();
      }

      if (this.navCode) {
        this.activeNavItem(undefined, this.navCode);
      }
    }
  }

  dissmiss(data?: any) {
    this.activeModal.dismiss(data);
  }

  activeNavItem(navItem: any, navCode?: any) {
    this.navItems.forEach((item: any) => {
      if ((navItem && item.code === navItem.code) || (navCode && item.code === navCode)) {
        item.isActive = true;
        this.navItemActive = item;
        this.hasActivatedDeeplinkNav[item.code] = true;
      }
      else {
        item.isActive = false;
      }
    });
  }

  isShowLeadApi() {
    return Helpers.safeGetByPath(this.campaign, "type.name")
      && Helpers.safeGetByPath(this.contractStatus, "activated")
      && Helpers.safeGetByPath(this.campaign, "lead_api")
      && (
        (this.campaign.type.name === 'CPO' || this.campaign.type.name === 'CPS')
        && this.contractStatus.activated > 0
        && this.campaign.lead_api === 1
      )
  }

  // TODO: API
  getCampaignById(id: any) {
    this.isLoading = true;
    this.campaignService.getCampaignById(id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.status === 'error' || response.status === 'fail') {
        } else {
          if (Helpers.safeGetByPath(response, "data.campaign")) {
            this.campaign = response.data.campaign;
            const campaignFiles = this.campaign.files;
    
            campaignFiles.forEach(item => {
              this.getFile(item);
            });
            
            if(this.campaign.has_ref_code) {
              this.getPublisherRefCode();
            }
          }
        }
        this.ableShowContainer = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.ableShowContainer = true;
        this.cdr.detectChanges();
      },
    });
  }

  getFile(file: any) {
    // this.isLoading = true;
    this.fileService.getFile(file).subscribe({
      next: (response) => {
        // this.isLoading = false;
        if (response.status === 'success') {
          if (response.data.file) {
            this.campaignFiles.push(response.data.file);
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        // this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getAdSpaceById(id: any) {
    this.isLoading = true;
    this.deepLinkService.getAdSpacesByCampaignId(id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response['status'] === 'success') {
          if (response['data'].adSpaces[0]) {
            this.adSpaces = response['data'].adSpaces;
            this.adSpaceDefault = response['data'].adSpaces[0];

            this.leadApi = this.serviceUrl + '/lead/store?campaign_id=' + id + '&ad_space_code=' + this.adSpaceDefault.code + '&token=' + this.token;
          }

        } else {
          this.adSpaces = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getPublisherCampaignContract(id) {
    this.isLoading = true;
    const filters = {
      'status': '1,2,3,4,5,6'
    };
    this.campaignService.getPublisherCampaignContract(id, filters).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.status === 'success' && response.data.contract) {
          this.contractCount = (response.data.contract).length;
          response.data.contract.map((item: any) => {
            if (item.status === 1) {
              this.contractStatus.pending++;
            }
            if (item.status === 2) {
              this.contractStatus.activated++;
            }
            if (item.status === 3) {
              this.contractStatus.rejected++;
            }
            if (item.status === 4) {
              this.contractStatus.in_active++;
            }
            if (item.status === 5) {
              this.contractStatus.paused++;
            }
            if (item.status === 6) {
              this.contractStatus.lock++;
            }
          });
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getPublisherRefCode()
  {
    // this.isLoading = true;
    let filters = {
      campaign_id: this.campaign.id,
      with_ad_space: 1,
      page_size: 100
    };
    this.publisherService.getPublisherRefCode(filters).subscribe({
      next: (response) => {
        // this.isLoading = false;
        if (response.status === 'success' && response.data.publisherRefCodes != null) {
          this.publisherRefCodes = response.data.publisherRefCodes;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        // this.isLoading = false;
        // this.cdr.detectChanges();
      },
    });
  }

  getCampaignConfigs() {
    this.campaignService.getCampaignConfigs().subscribe({
      next: (response) => {
        // this.isLoading = false;
        this.campaignConfigs = response.data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        
      },
    });
  }
}