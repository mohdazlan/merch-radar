import type {
  ActiveComps,
  DemandSource,
  SearchQuery,
  SoldBrowseHistory,
  SoldComps,
  SoldUnavailable,
} from "@/lib/ebay/DemandSource";
import { DEFAULT_FIXTURE, findFixture } from "@/lib/db/fixtures/comps";

/** Demo Mode implementation — serves synthetic comps, never hits eBay. */
export class FixtureSource implements DemandSource {
  async getActive(q: SearchQuery): Promise<ActiveComps> {
    const fixture = findFixture(q.q) ?? DEFAULT_FIXTURE;
    return fixture.active;
  }

  async getSold(q: SearchQuery): Promise<SoldComps | SoldBrowseHistory | SoldUnavailable> {
    const fixture = findFixture(q.q) ?? DEFAULT_FIXTURE;
    return fixture.sold;
  }
}
