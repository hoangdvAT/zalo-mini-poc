import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Helpers } from "../../../../shared/helpers/helpers";
import { CLICK_TYPE } from "../constants/campaign-config.constant";
import { TranslateService, TranslationChangeEvent } from "@ngx-translate/core";
import { CampaignModalComponent } from "../campaign-modal/campaign-modal.component";
import { CampaignService } from "../../../../modules/campaign/campaign.service";
import { PublisherService } from "../../../../modules/publisher/publisher.service";
import { DeepLinkService } from "../../../../modules/deep-link/deep-link.service";
import { FileService } from "../../../../modules/common/file.service";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { AlertService } from "../../../../modules/common/alert.service";
import { GlobalService } from "../../../../global.service";
@Component({
  selector: 'app-campaign-general',
  templateUrl: './campaign-general.component.html',
  styleUrls: [
    '../../../../../assets/scss/v2/v2.scss',
    '../../../../../assets/scss/utils/utils.scss',
    './campaign-general.component.scss',
  ],
})
export class CampaignGeneralComponent extends CampaignModalComponent implements OnInit, OnChanges {
  // TODO: Define decorators
  @Input() data: any;

  // TODO: Define element
  // TODO: Define constants
  globalConfig = this.globalService.globalConfig;

  statusesConfig = {
    '1': "pending",
    '2': "activated",
    '3': "rejected",
    '4': "paused",
    '5': "finished",
    '6': "in-active",
  }

  // TODO: Define model

  // TODO: Define var
  tags: {type: string, label: string}[] = [];

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

    private globalService: GlobalService,
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
      // this.getCampaignConfigs();

    });
    this.getData();
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
      this.campaign = this.data.campaign;
      this.campaignConfigs = this.data.campaignConfigs;
    }
    this.getTags();
  }

  getTags() {
    if (this.campaign) {
      let typeName = Helpers.safeGetByPath(this.campaign, "type.name");
      let currencyNames: any;
      if (this.campaign.currencies) {
        currencyNames = this.campaign.currencies.map((currency: any) => {
          return currency.name;
        });
      }
      let areaNames: any;
      if (this.campaign.areas) {
        areaNames = this.campaign.areas.map((area: any) => {
          return area.name;
        });
      }
      let categoryNames: any;
      if (this.campaign.categories) {
        categoryNames = this.campaign.categories.map((category: any) => {
          return category.name;
        });
      }
      let deepLinkName: any;
      if (this.campaign.has_deeplink) {
        deepLinkName = this.translate.instant("Deeplink");
      }

      let reoccurName: any;
      if (this.campaign.reoccur) {
        reoccurName = this.translate.instant("Reoccur");
      }

      let lastClickName: any;
      let lastClickConfig: any;
      if (this.campaignConfigs) lastClickConfig = Object.values(this.campaignConfigs.clickType).find((clickType: any) => clickType.code === CLICK_TYPE.LAST);

      if (
        lastClickConfig &&
        this.campaign.click_type === Helpers.safeGetByPath(lastClickConfig, "id")
      ) {
        lastClickName = this.translate.instant("Last Click");
      }

      this.tags = []
      let nameTags = [typeName, currencyNames, areaNames, categoryNames];
      let flagTags = [deepLinkName, reoccurName, lastClickName];

      nameTags.forEach((nameTagVariable: any) => {
        if (Array.isArray(nameTagVariable)) {
          nameTagVariable.forEach((varItem: any) => {
            this.tags.push({
              type: "NameTag",
              label: varItem,
            });
          })
        }
        else {
          this.tags.push({
            type: "NameTag",
            label: nameTagVariable,
          })
        }
      })

      flagTags.forEach((flagTag: any) => {
        if (flagTag) {
          this.tags.push({
            type: "FlagTag",
            label: flagTag,
          });
        }
      });
    }

    this.cdr.detectChanges();
  }

  // TODO: API

}
