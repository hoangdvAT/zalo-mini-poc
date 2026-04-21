import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CampaignService } from '../../../campaign/campaign.service';
import { FormControl, FormGroup } from '@angular/forms';
import { AlertService } from '../../../common/alert.service';
import { ContractService } from '../../../contract/contract.service';
import * as moment from 'moment';
import { CONTANT } from '../../../../../assets/config/CONTANT';
import { GlobalService } from '../../../../global.service';
import { TranslateService, TranslationChangeEvent } from '@ngx-translate/core';
import { ngxLoadingAnimationTypes } from 'ngx-loading';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CampaignModalComponent } from '../campaign-modal/campaign-modal.component';
import { CONSTANTS } from '../../../../../assets/constant/constants';
import { HelpersService } from 'src/app/shared/helpers/helpers.service';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: [
    './index.component.scss',
    '../../../../../assets/scss/v2/v2.scss',
    '../../../../../assets/scss/utils/utils.scss',
  ]
})
export class IndexComponent implements OnInit {
  // TODO: Define decorators
  // TODO: Define element
  // TODO: Define constants
  globalConfig = this.globalService.globalConfig;
  public ngxLoadingAnimationTypes = ngxLoadingAnimationTypes;
  sortSets: any[] = [
    { id: "label,0", name: "All" },
    { id: "label,1", name: "Hot" },
    { id: "label,2", name: "Newest" },
    { id: "label,3", name: "Big brand" },
    { id: "label,4", name: "Trend" },
  ];
  dataConfig = this.globalService.globalConfig;

  NAV_CODES = {
    GENERAL_INFORMATION: "GENERAL_INFORMATION",
    LEAD_API: "LEAD_API",
    DEEP_LINK: "DEEP_LINK",
    EMBED_JS: "EMBED_JS",
    CREATE_ORDER: "CREATE_ORDER",
    REFERRAL_CODE: "REFERRAL_CODE",
  }

  // TODO: Define model
  // TODO: Define var
  private destroy$ = new Subject<void>();

  paging: { total: number, total_page: number, page: number, page_size: number } = {
    total: 0,
    total_page: 0,
    page: 1,
    page_size: 20,
  }

  campaigns = [];
  campaignsInfo: any;
  campaignConfigs: any;
  typeConfig: any;
  categoryConfig: any;
  areaConfig: any;
  integrationTypeConfig: any;
  statusConfig: any;
  sortBy = 'label,0';
  sortByDefault = "label,0";
  lang = 'en';

  searchParams = {
    name: '',
    type_ids: [],
    category_ids: [],
    area_ids: [],
    status: null,
    integration_type_ids: '',
    sort: '',
  };
  filterSets: { key: string, label: string, value: any, isMulti: boolean, array: any[] }[] = [];

  // TODO: Define flag
  loading: boolean = false;
  isSearch: boolean = false;
  isJoined: boolean = false;

  // TODO: Define reactive form
  searchCampaign = new FormGroup({
    name: new FormControl(''),
    type_ids: new FormControl(''),
    category_ids: new FormControl(''),
    area_ids: new FormControl(''),
    integration_type_ids: new FormControl(''),
    status: new FormControl(''),
    sort: new FormControl('label,0'),
  });

  controls = this.searchCampaign.controls;

  // TODO: Define icon
  // TODO: Constructor
  // TODO: Life cycler
  // TODO: Event
  onChangeIsJoined(isJoined: any) {
    const segments = isJoined ? ['me', 'campaigns'] : ['campaigns'];
    const v2Root = this.route.parent && this.route.parent.parent ? this.route.parent.parent : this.route.parent;
    this.router.navigate(segments, { relativeTo: v2Root }).then(() => this.resetSearch());
  }

  // TODO: Handle Emitter
  handleOpenCampaignEmitter(campaignId: number) {
    this.openCampaignModal(campaignId);
  }

  handleJoinEmitter(campaign: any) {
    this.join(campaign.id);
  }

  handleCreateDeeplinkEmitter(campaign: any) {
    this.openCampaignModal(campaign, this.NAV_CODES.DEEP_LINK, "CREATE")
  }

  // TODO: Process
  // TODO: API

  constructor(
    private campaignService: CampaignService,
    private modalService: NgbModal,
    private alertService: AlertService,
    private contractService: ContractService,
    private helpersService: HelpersService,
    private globalService: GlobalService,
    private translate: TranslateService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.translate.onLangChange.subscribe((event: TranslationChangeEvent) => {
      if (this.campaignConfigs) {
        this.updateTranslateConfig();
        this.handleFilter();
      }
    });
    this.setParam();
  }

  setParam() {
    this.route.queryParams.subscribe(params => {
      if (params['page'] && this.paging.page !== parseFloat(params['page'])) {
        this.paging.page = params['page'];
      }
      this.isJoined = this.router.url.includes('/me/campaigns')
        ? true
        : (params['is_joined'] ? params['is_joined'] : false);
      this.searchParams.name = params['name'] ? params['name'] : '';
      this.searchParams.status = params['status'] ? +params['status'] : '';
      this.searchParams.integration_type_ids = params['integration_type_ids'] ? params['integration_type_ids'] : '';
      this.searchParams.sort = params['sort'] ? params['sort'] : null;

      // set type
      const type_ids = params['type_ids'] ? params['type_ids'].split(',') : '';
      const type = [];
      if (type_ids) {
        type_ids.map((item: any) => {
          type.push(+item);
        });
      }
      this.searchParams.type_ids = type;
      // set category
      const category_ids = params['category_ids'] ? params['category_ids'].split(',') : '';
      const category = [];
      if (category_ids) {
        category_ids.map((item: any) => {
          category.push(+item);
        });
      }
      this.searchParams.category_ids = category;

      // set area
      const area_ids = params['area_ids'] ? params['area_ids'].split(',') : '';
      const area = [];
      if (area_ids) {
        area_ids.map((item: any) => {
          area.push(+item);
        });
      }
      this.searchParams.area_ids = area;

      // set status
      this.searchCampaign.setValue(this.searchParams);

      this.handleFilter(this.searchParams);
    });
  }

  ngOnInit() {
    this.isJoined = this.router.url.indexOf('/me/campaigns') !== -1;
    if (this.isJoined) {
      this.getPublisherCampaigns(1);
    } else {
      this.getCampaigns(1);
    }
    this.getCampaignConfigs();
    this.lang = localStorage.getItem('lang');
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.lang = event.lang;
        this.cdr.detectChanges();
      });
  }

  countDays(start: any) {
    const now = moment().format('YYYY/MM/DD');

    const a = moment(start, 'YYYY/MM/DD');
    const b = moment(now, 'YYYY/MM/DD');
    return b.diff(a, 'days');
  }

  async getCampaigns(page: any) {
    this.loading = true;
    this.cdr.detectChanges();
    const filters = this.searchCampaign.value;
    await this.campaignService.getCampaignsWithoutContract(filters, page, this.sortBy).toPromise().then(response => {
      if (response.status === 'success') {
        this.campaigns = response.data.campaigns;
        this.paging.page = response.data.meta.current_page;
        this.paging.total = response.data.meta.total;
        this.paging.page_size = response.data.meta.per_page;
      }
    });

    const campaign_ids = this.campaigns.map(x => x.id);
    this.campaignService.getCampaignsInfo({ campaigns: IndexComponent.convertArrayToString(campaign_ids) }).subscribe(response => {
      this.loading = false;
      if (response.status === 'success') {
        this.campaignsInfo = response.data.info;
      }
      this.cdr.detectChanges();
    });
  }

  async getPublisherCampaigns(page: any) {
    const filters = this.searchCampaign.value;
    filters.invited = CONSTANTS.myCampaign.invited;
    filters.contract_status = CONSTANTS.myCampaign.contractStatus;
    filters.publisher_status = CONSTANTS.myCampaign.publisherStatus;
    filters.inStatus = CONSTANTS.myCampaign.inStatus;

    this.loading = true;
    this.cdr.detectChanges();
    await this.campaignService.getCampaignsWithContract(filters, page, '').toPromise().then(response => {
      this.campaigns = response.data.campaigns;
      this.paging.page = response.data.meta.current_page;
      this.paging.total = response.data.meta.total;
      this.paging.page_size = response.data.meta.per_page;
    });

    const campaign_ids = this.campaigns.map(x => x.id);
    this.campaignService.getCampaignsInfo({ campaigns: this.convertArrayToString(campaign_ids) }).subscribe(response => {
      this.loading = false;
      if (response.status === 'success') {
        this.campaignsInfo = response.data.info;
      }
      this.cdr.detectChanges();
    });
  }

  static convertArrayToString(array) {
    if (array instanceof Array) {
      return array.join();
    } else {
      return array;
    }
  }

  getCampaignConfigs() {
    this.campaignService.getCampaignConfigs().subscribe(response => {
      this.campaignConfigs = response.data;
      this.typeConfig = Object.values(this.campaignConfigs.type);
      this.categoryConfig = Object.values(this.campaignConfigs.categories);
      this.areaConfig = Object.values(this.campaignConfigs.areas);
      this.integrationTypeConfig = Object.values(this.campaignConfigs.integrationType);
      this.statusConfig = Object.values(this.campaignConfigs.status);

      this.updateTranslateConfig();
      this.cdr.detectChanges();

      this.handleFilter(this.searchParams);
    });
  }

  updateTranslateConfig() {
    this.typeConfig = this.typeConfig.map(item => {
      return {
        ...item,
        translatedName: this.translate.instant(item.name),
      }
    });
    this.categoryConfig = this.categoryConfig.map(item => {
      return {
        ...item,
        translatedName: this.translate.instant(item.name),
      }
    });
    this.areaConfig = this.areaConfig.map(item => {
      return {
        ...item,
        translatedName: this.translate.instant(item.name),
      }
    });
    this.integrationTypeConfig = this.integrationTypeConfig.map(item => {
      return {
        ...item,
        translatedName: this.translate.instant(item.name),
      }
    });
    this.statusConfig = this.statusConfig.map(item => {
      return {
        ...item,
        translatedName: this.translate.instant(item.name),
      }
    });

    this.handleFilter();
  }

  search() {
    this.addRouter();
    if (this.isJoined) {
      this.getPublisherCampaigns(1);
    }
    else {
      this.getCampaigns(1);
    }
  }

  changePage($event: any) {
    this.paging.page = $event;
    this.addRouter();

    if (this.isJoined) {
      this.getPublisherCampaigns(this.paging.page);
    }
    else {
      this.getCampaigns(this.paging.page);
    }
  }

  join(id: any) {
    this.contractService.joinCampaign({ campaign_id: id }).subscribe(response => {
      if (response.status === 'fail') {
        const typeData = typeof response.data.check;
        if (typeData === 'object') {
          if (response.data.check.total > 0) {
            if (response.data.check.pending > 0) {
              const message = this.lang === 'en' ? CONTANT.AD_SPACE.ADSPACE_PENDING_EN : CONTANT.AD_SPACE.ADSPACE_PENDING_VI;
              this.alertService.fireModal('info', message, '');
            } else {
              const message = this.lang === 'en' ? CONTANT.AD_SPACE.ADSPACE_EMPTY_EN : CONTANT.AD_SPACE.ADSPACE_EMPTY_VI;
              const text = this.lang === 'en' ? CONTANT.AD_SPACE.CREATE_EN : CONTANT.AD_SPACE.CREATE_VI;
              const closeText = this.lang === 'en' ? CONTANT.AD_SPACE.CLOSE_EN : CONTANT.AD_SPACE.CLOSE_VI;
              this.alertService.fireCenter('info', response.data, message, '/v2/ad-spaces', text, closeText);
            }
          } else {
            const message = this.lang === 'en' ? CONTANT.AD_SPACE.ADSPACE_EMPTY_EN : CONTANT.AD_SPACE.ADSPACE_EMPTY_VI;
            const text = this.lang === 'en' ? CONTANT.AD_SPACE.CREATE_EN : CONTANT.AD_SPACE.CREATE_VI;
            const closeText = this.lang === 'en' ? CONTANT.AD_SPACE.CLOSE_EN : CONTANT.AD_SPACE.CLOSE_VI;
            this.alertService.fireCenter('info', response.data, message, '/v2/ad-spaces', text, closeText);
          }
        } else if (typeData === 'undefined') {
          const message = this.lang === 'en' ? 'You\'re not allowed to join this campaign' : 'Bạn không có quyền tham gia chiến dịch'
          this.alertService.fireSmall('error', message);
        }
      } else if (response.status === 'error') {
        if (response.errorCode && response.errorCode === 403) {
          this.alertService.fireSmall('error', response.message);
        } else {
          const message = this.lang === 'en' ? CONTANT.CAMPAIGN.JOIN_CAMPAIGN_ERROR_EN : CONTANT.CAMPAIGN.JOIN_CAMPAIGN_ERROR_VI;
          this.alertService.fireSmall('success', message);
        }
      } else {
        const message = this.lang === 'en' ? CONTANT.CAMPAIGN.JOIN_CAMPAIGN_SUCCESS_EN : CONTANT.CAMPAIGN.JOIN_CAMPAIGN_SUCCESS_VI;
        this.alertService.fireSmall('success', message);

        this.getCampaigns(this.paging.page);
      }
      this.cdr.detectChanges();
    });
  }

  addRouter() {
    const type_ids = this.searchCampaign.value.type_ids ? IndexComponent.convertArrayToString(this.searchCampaign.value.type_ids) : null;
    const category_ids = this.searchCampaign.value.category_ids ? IndexComponent.convertArrayToString(this.searchCampaign.value.category_ids) : null;
    const area_ids = this.searchCampaign.value.area_ids ? IndexComponent.convertArrayToString(this.searchCampaign.value.area_ids) : null;
    const queryParams: any = {};
    if (this.paging.page) queryParams.page = this.paging.page;
    if (this.searchCampaign.value.name) queryParams.name = this.searchCampaign.value.name;
    if (this.searchCampaign.value.code) queryParams.code = this.searchCampaign.value.code;
    if (type_ids) queryParams.type_ids = type_ids;
    if (category_ids) queryParams.category_ids = category_ids;
    if (area_ids) queryParams.area_ids = area_ids;
    if (this.searchCampaign.value.integration_type_ids) queryParams.integration_type_ids = this.searchCampaign.value.integration_type_ids;
    if (this.searchCampaign.value.status) queryParams.status = this.searchCampaign.value.status;
    if (this.searchCampaign.value.sort) queryParams.sort = this.searchCampaign.value.sort;
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: '' });
  }

  convertArrayToString(array) {
    if (array instanceof Array) {
      return array.join();
    } else {
      return array;
    }
  }

  openFilterModal(modal: any) {
    const modalRef = this.modalService.open(modal, {
      size: 'lg',
      windowClass: 'template-modal',
      centered: true,
      backdrop: true,
      keyboard: true,
    });

    modalRef.result.then((result: any) => {
      if (result) {
        this.handleFilter(result);
        this.searchSubmit();
      }
    }).catch(() => {
      // Modal bị dismiss, không làm gì
    });
  }

  handleFilter(obj?: any) {
    let searchParams;
    if (obj) {
      searchParams = obj;
    }
    else {
      searchParams = this.searchCampaign.getRawValue();
    }
    this.filterSets = [];
    Object.keys(searchParams).map((key: string) => {
      let label: string;
      let array: any[];
      switch (key) {
        case "name": label = "Campaign Name"; break;
        case "type_ids": label = "Campaign Type"; array = this.typeConfig; break;
        case "category_ids": label = "Category"; array = this.categoryConfig; break;
        case "area_ids": label = "Area"; array = this.areaConfig; break;
        case "sort": label = "Sort By"; array = this.sortSets; break;
      }

      const value = searchParams[key];
      const isMulti = Array.isArray(searchParams[key]) ? true : false;
      if (label && value) {
        // const label = this.translate.instant(label);
        // const label = label;
        let title = "";
        if (isMulti) {
          title = value.map((val: any) => this.helpersService.findObjectBy(array, "id", val).translatedName).join(", ");
        }
        else {
          title = key === "sort" ? this.translate.instant(value) : value;
        }

        const filterSet: any = {
          key: key,
          label: label,
          value: value,
          array: array,
          isMulti: isMulti,
          title: title,
        };
        this.filterSets.push(filterSet);
      }
    })
    this.sortBy = searchParams.sort ? searchParams.sort : this.sortByDefault;
    this.searchParams = searchParams;
    this.cdr.detectChanges();
  }

  /**
   *
   * @param key
   * @param value Tham số value chỉ truyền vào khi bỏ filter là một giá trị của multi select
   */
  removeFilterItem(key: string, value?: any) {
    if (value !== undefined) {
      // value
      let values = this.searchCampaign.get(key).value;
      values = values.filter((val: any) => val !== value);
      this.searchCampaign.get(key).setValue(values);
    }
    else {
      this.searchCampaign.get(key).reset();
      // Nếu key là các select thì set về giá trị null
      if (["sort"].includes(key)) {
        this.searchCampaign.get(key).setValue(null);
      }
    }
    this.cdr.detectChanges();
    this.handleFilter();
    this.searchSubmit();
  }

  resetSearch() {
    this.searchCampaign.reset();
    this.cdr.detectChanges();
    this.handleFilter();
    this.searchSubmit();
  }

  isAbleResetSearch() {
    try {
      let length: number;
      if (this.filterSets) {
        length = this.filterSets.length;
        for (let i = 0; i < length; i++) {
          let filterSet = this.filterSets[i];
          if (filterSet.isMulti) {
            let values = filterSet.value;
            let length2: number;
            if (values) {
              length2 = values.length;
              if (length2) {
                return true;
              }
            }
          }
          else {
            if (filterSet.key === "sort" && filterSet.value === "label,0") {

            }
            else {
              return true;
            }
          }
        }
      }
      return false;
    }
    catch (err) {
      console.error(err);
    }
  }

  searchSubmit() {
    this.search();
  }

  openCampaignModal(campaign: any, navCode?: string, action?: string) {
    const modalRef = this.modalService.open(CampaignModalComponent, {
      windowClass: "offcanvas-right campaign-detail-modal",
      size: 'lg',
      backdrop: true,
      keyboard: true,
    });

    modalRef.componentInstance.data = {
      campaign: campaign,
      campaignConfigs: this.campaignConfigs,
      navCode: navCode,
      action: action,
    }

    modalRef.result.then((result: any) => {
      if (result) {

      }
    }).catch(() => {
      // Modal bị dismiss, không làm gì
    });
    this.cdr.detectChanges();
  }
}
