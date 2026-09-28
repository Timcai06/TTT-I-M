import { Config } from '@remotion/cli/config'

// The films use the site's own screenshots and photos, straight from its public folder.
// public/ holds symlinks: site → the landing's public folder, takes → recorded footage, voice → narration
Config.setPublicDir('public')
Config.setVideoImageFormat('png')
Config.setConcurrency(4)
