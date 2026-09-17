import {expect,test} from 'vitest';
import {casePriority} from './casePriority';
import {usRiceOffers,usRiceRequest} from '../../fixtures/procurement';
test('worklist ranks explicit missing terms without inventing spend or urgency',()=>{
 const item={status:'complete',researchRunIds:['run']};
 const blocked=casePriority(item,{request:usRiceRequest,offers:usRiceOffers.map(o=>({...o,freightCents:null}))});
 expect(blocked.reason).toBe('Commercial terms need confirmation');
 expect(blocked.rank).toBeLessThan(casePriority({status:'failed',researchRunIds:[]}).rank);
 expect(casePriority(item).reason).toBe('Research evidence available');
 expect(casePriority({status:'idle',researchRunIds:[]}).reason).toBe('Saved question');
});
