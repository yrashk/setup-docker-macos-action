const exec = require('@actions/exec')
const glob = require('@actions/glob')
const path = require('path')

exports.cacheKey = async function homebrewCacheKey(binTools, deps) {
  const brewRepositoryResult = await exec.getExecOutput('brew', [
    '--repository',
  ])
  if (brewRepositoryResult.exitCode === 1) {
    throw "Cannot determine Homebrew's repository path."
  }

  const repository = brewRepositoryResult.stdout.trim()
  const cacheKeyFiles = binTools.map((value) => {
    path.join(
      repository,
      'Library',
      'Taps',
      'homebrew',
      'homebrew-core',
      'Formula',
      `${value}.rb`,
    )
  })

  for (let dep of deps) {
    const formulaPath = path.join(
      repository,
      'Library',
      'Taps',
      'homebrew',
      'homebrew-core',
      'Formula',
      `${dep}.rb`,
    )
    cacheKeyFiles.push(formulaPath)
  }
  return `homebrew-formulae-${await glob.hashFiles(
    cacheKeyFiles.join('\n'),
  )}`
}

exports.cacheFolder = async function homebrewCacheFolder(binTools, deps) {
  const toCache = []
  const brewCellarResult = await exec.getExecOutput('brew', ['--cellar'])
  if (brewCellarResult.exitCode === 1) {
    throw "Cannot determine Homebrew's cellar path."
  }

  const cellar = brewCellarResult.stdout.trim()
  const binCacheFolders = binTools.map((value) => {
    path.join(cellar, value)
  })
  toCache.push(...binCacheFolders)

  for (let dep of deps) {
    const baseDepFolder = path.join(cellar, dep)
    const versionFolderResult = await exec.getExecOutput('ls', [baseDepFolder])
    if (versionFolderResult.exitCode === 1) {
      throw "Cannot list Homebrew's formula versions."
    }
    const versionFolder = versionFolderResult.stdout
      .trim()
      .replaceAll('\t', ' ')
    toCache.push(path.join(baseDepFolder, versionFolder))
  }
  return toCache
}