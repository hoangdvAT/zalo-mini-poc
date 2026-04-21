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
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { environment } from "../../../../../environments/environment";
@Component({
  selector: 'app-create-conversion',
  templateUrl: './create-conversion.component.html',
  styleUrls: [
    '../../../../../assets/scss/v2/v2.scss',
    '../../../../../assets/scss/utils/utils.scss',
    './create-conversion.component.scss',
  ],
  host: {class: 'h-100'},
})
export class CreateConversionComponent extends CampaignModalComponent implements OnInit, OnChanges {
  // TODO: Define decorators
  @Input() data: any;

  // TODO: Define element
  // TODO: Define constants
  captchaKey = environment.google_captcha_key;

  // TODO: Define model

  // TODO: Define var

  // TODO: Define flag

  // TODO: Define reactive form
  createConversion: FormGroup;

  initCreateConverionFormGroup() {
    this.createConversion = new FormGroup({
      name:  new FormControl('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(/^[^\s]+(\s+[^\s]+)*$/)
      ]),
      phone:  new FormControl('', [
        Validators.required,
        Validators.pattern(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/im)
      ]),
      note:  new FormControl('', [
        Validators.maxLength(500),
      ]),
      address:  new FormControl('', [
        Validators.required,
        Validators.maxLength(200),
      ]),
      quantity:  new FormControl(1, [Validators.max(50), Validators.min(1)])
    });
  }

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
    this.initCreateConverionFormGroup();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.data.currentValue !== changes.data.previousValue) {
      this.data = changes.data.currentValue;
      this.getData();
    }
  }

  // TODO: Event

  // TODO: Handle Emitter
  // TODO: Process
  getData() {
    if (this.data) {
      this.leadApi = this.data.leadApi;
    }
  }

  get name() {
    return this.createConversion.get('name');
  }

  get phone() {
    return this.createConversion.get('phone');
  }

  get note() {
    return this.createConversion.get('note');
  }

  get address() {
    return this.createConversion.get('address');
  }

  get quantity() {
    return this.createConversion.get('quantity');
  }

  resolved(captchaResponse: string) {
    if (captchaResponse) { this.captchaToken = captchaResponse; }
  }

  getAllUrlParams(url) {
    const queryString = url ? url.split('?')[1] : window.location.search.slice(1);
    const obj = {};
    if (queryString) {
      const arr = queryString.split('&');
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i].split('=');
        let paramName = a[0];
        const paramValue = typeof (a[1]) === 'undefined' ? true : a[1];
        paramName = paramName.toLowerCase();
        if (paramName.match(/\[(\d+)?\]$/)) {
          const key = paramName.replace(/\[(\d+)?\]/, '');
          if (!obj[key]) { obj[key] = []; }
          if (paramName.match(/\[\d+\]$/)) {
            const index = /\[(\d+)\]/.exec(paramName)[1];
            obj[key][index] = paramValue;
          } else {
            obj[key].push(paramValue);
          }
        } else {
          if (!obj[paramName]) {
            obj[paramName] = paramValue;
          } else if (obj[paramName] && typeof obj[paramName] === 'string') {
            obj[paramName] = [obj[paramName]];
            obj[paramName].push(paramValue);
          } else {
            obj[paramName].push(paramValue);
          }
        }
      }
    }
    return obj;
  }

  // TODO: API
  createConversions() {
    if (this.captchaToken) {
      this.isLoading = true;
      const data = this.getAllUrlParams(this.leadApi);
      data['name'] = this.createConversion.value.name;
      data['phone'] = this.createConversion.value.phone;
      let info_prod  = this.createConversion.value.note;
      data['note'] = this.createConversion.value.address;
      if (info_prod && info_prod !== 'null') {
        data['note'] += ' ; ' + info_prod;
      }
      data['quantity'] = this.createConversion.value.quantity;
      data['captcha_token'] = this.captchaToken;
      this.campaignService.createConversion(data).subscribe(response => {
        this.isLoading = false;
        if (response.status === 'success') {
          this.alertService.fireSmall('success', 'Tạo đơn thành công !');
        } else {
          this.alertService.fireSmall('error', response.message);
        }
        this.cdr.detectChanges();
      });
      this.createConversion.reset();
      this.createConversion.patchValue({quantity: 1});
      grecaptcha.reset();
      this.captchaToken = '';
    } else {
      this.alertService.fireSmall('error', 'Vui lòng xác thực');
    }
  }
}