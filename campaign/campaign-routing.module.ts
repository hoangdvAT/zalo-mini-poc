import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {IndexComponent} from './index/index.component';
import {CheckPermissionGuard} from '../../common-basic/check-permission.guard';

// TODO: add check permission for this module
const MODULE_NAME = 'all';

const routes: Routes = [
  {
    path: '',
    component: IndexComponent,
    canActivate: [CheckPermissionGuard],
    data: {
      title: 'Campaigns',
      urls: [
        { title: 'Dashboard', url: '/' },
        { title: 'Campaigns' }
      ],
      module: MODULE_NAME,
      action: 'index',
      sidebarMenuPath: '/campaigns',
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CampaignV2RoutingModule {
}
