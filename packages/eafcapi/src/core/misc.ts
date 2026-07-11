import { ISettings } from './../model/misc'
import { getNoParam, TPlatformType } from './api'
export const getSettings = (platform: TPlatformType) => getNoParam<ISettings>(platform, 'settings')

