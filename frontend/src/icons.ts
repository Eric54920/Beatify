import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlay, faPause, faBackward, faForward, faShuffle, faRepeat, faVolumeLow, faVolumeHigh, faListUl, faSortUp, faSortDown, faEllipsis } from '@fortawesome/free-solid-svg-icons' // 引入你需要的图标
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// 将图标加入到库中
library.add(faPlay, faPause, faBackward, faForward, faShuffle, faRepeat, faVolumeLow, faVolumeHigh, faListUl, faSortUp, faSortDown, faEllipsis)

export { FontAwesomeIcon }
