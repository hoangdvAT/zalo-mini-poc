import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'isShowLeadApiTab'})

export class IsShowLeadApiTabPipe implements PipeTransform {
  transform(campaignName: string, contractStatus: any, hasLeadApi: any): any {
    return (campaignName === 'CPO' || campaignName === 'CPS')
      && contractStatus > 0
      && hasLeadApi === 1
  }
}
