import {Component, OnDestroy, OnInit, ViewEncapsulation} from "@angular/core";
import {DragAndDropService} from "core-app/modules/boards/drag-and-drop/drag-and-drop.service";
import {from, Observable, Subject} from "rxjs";
import {debounceTime, distinctUntilChanged, filter, tap, withLatestFrom} from "rxjs/operators";
import {NotificationsService} from "core-app/modules/common/notifications/notifications.service";
import {I18nService} from "core-app/modules/common/i18n/i18n.service";
import {BoardListsService} from "core-app/modules/boards/board/board-list/board-lists.service";
import {QueryDmService} from "core-app/modules/hal/dm-services/query-dm.service";
import {BoardCacheService} from "core-app/modules/boards/board/board-cache.service";
import {BoardService} from "core-app/modules/boards/board/board.service";
import {Board} from "core-app/modules/boards/board/board";
import {untilComponentDestroyed} from "ng2-rx-componentdestroyed";
import {StateService} from "@uirouter/core";

@Component({
  selector: 'board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.sass'],
  providers: [
    DragAndDropService,
  ]
})
export class BoardComponent implements OnInit, OnDestroy {

  // We only support 4 columns for now while the grid does not autoscale
  readonly maxCount = 4;

  /** Rename events */
  public rename$ = new Subject<string>();

  public board$:Observable<Board|undefined>;

  public text = {
    unnamedBoard: 'Unnamed board',
    loadingError: 'No such board found',
    addList: 'Add list'
  };

  useCardView = false;

  constructor(private readonly state:StateService,
              private readonly I18n:I18nService,
              private readonly notifications:NotificationsService,
              private readonly BoardList:BoardListsService,
              private readonly QueryDm:QueryDmService,
              private readonly BoardCache:BoardCacheService,
              private readonly Boards:BoardService) {
  }

  goBack() {
    this.state.go('^');
  }

  ngOnInit():void {
    const id:number = this.state.params.id;

    this.BoardCache.require(id.toString());
    this.board$ = from(this.BoardCache.observe(id.toString()))
      .pipe(
        tap(b => {
          if (b === undefined) {
            this.showError();
          }
        })
      );

    this.rename$
      .pipe(
        untilComponentDestroyed(this),
        debounceTime(1000),
        distinctUntilChanged(),
        withLatestFrom(this.board$),
        filter(([, board]) => board !== undefined)
      )
      .subscribe(([newName, board]) => {
        let b = board as Board;

        b.name = newName;
        this.Boards
          .save(b)
          .then(board => this.BoardCache.update(board));
      });
  }

  ngOnDestroy():void {
    // Nothing to do.
  }

  showError() {
    this.notifications.addError(this.text.loadingError);
  }

  addList(board:Board) {
    this.BoardList
      .addQuery(board)
      .then(board => this.Boards.save(board))
      .then(saved => {
        this.BoardCache.update(saved);
      });
  }
}