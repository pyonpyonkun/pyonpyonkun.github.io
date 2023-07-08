import { getPlayerDataThrottled } from './slippi'
import * as syncFs from 'fs';
import * as path from 'path';
import util from 'util';
import * as settings from '../settings'

import { exec } from 'child_process';
const fs = syncFs.promises;
const execPromise = util.promisify(exec);

const getPlayerConnectCodes = async (): Promise<string[]> => { 
	return ['C4D#69','LNK#691','DRM#815','FLOW#561','STEV#566','MLOG#546','XHIV#789','INCO#582','ALBU#478','CUAK#787','DIE#222','EDMX#007','FRAP#866','MART#153','HYRU#485','JOSM#616','DRZK#408','SHEI#891','YAAA#386','ZAMO#948','ZAMO#797','MELE#790','HELL#259','YU#117','ARO#384','MINR#3','ZOUL#0','LFGF#858','FAR#167','LAG#318','XHLN#234','OREO#696','VALD#536','YUNG#117','PANT#706','CEPO#409','ALDI#393','JPG#982','DASH#330','BUGO#344','KUKU#174','RAEL#365','LFGB#666','TTVT#339','ISAI#485','PLUS#118','COBS#958','NOTU#753','RAWK#142','GULD#376','MIKE#440','PAKO#500','ARCHI#0','YAYI#325','LYK#735','HLDN#289','FROZ#377','FEDX#329','ARCA#559','JONA#556','STGR#916','YORU#462','OCEA#901'] };
const getPlayers = async () => {
  const codes = await getPlayerConnectCodes()
  console.log(`Found ${codes.length} player codes`)
  const allData = codes.map(code => getPlayerDataThrottled(code))
  const results = await Promise.all(allData.map(p => p.catch(e => e)));
  const validResults = results.filter(result => !(result instanceof Error));
  const unsortedPlayers = validResults
    .filter((data: any) => data?.data?.getConnectCode?.user)
    .map((data: any) => data.data.getConnectCode.user);
  return unsortedPlayers.sort((p1, p2) =>
    p2.rankedNetplayProfile.ratingOrdinal - p1.rankedNetplayProfile.ratingOrdinal)
}

async function main() {
  console.log('Starting player fetch.');
  const players = await getPlayers();
  if(!players.length) {
    console.log('Error fetching player data. Terminating.')
    return
  }
  console.log('Player fetch complete.');
  // rename original to players-old
  const newFile = path.join(__dirname, 'data/players-new.json')
  const oldFile = path.join(__dirname, 'data/players-old.json')
  const timestamp = path.join(__dirname, 'data/timestamp.json')

  await fs.rename(newFile, oldFile)
  console.log('Renamed existing data file.');
  await fs.writeFile(newFile, JSON.stringify(players));
  await fs.writeFile(timestamp, JSON.stringify({updated: Date.now()}));
  console.log('Wrote new data file and timestamp.');
  const rootDir = path.normalize(path.join(__dirname, '..'))
  console.log(rootDir)
  // if no current git changes
  const { stdout, stderr } = await execPromise(`git -C ${rootDir} status --porcelain`);
  if(stdout || stderr) {
    console.log('Pending git changes... aborting deploy');
    return
  }
  console.log('Deploying.');
  const { stdout: stdout2, stderr: stderr2 } = await execPromise(`npm run --prefix ${rootDir} deploy`);
  console.log(stdout2);
  if(stderr2) {
    console.error(stderr2);
  }
  console.log('Deploy complete.');
}

main();
