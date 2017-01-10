import * as React from 'react';
import { IPivotProps } from './Pivot.Props';
import { IPivotItemProps } from './PivotItem.Props';
import { FocusZone, FocusZoneDirection } from '../../FocusZone';
import { KeyCodes } from '../../utilities/KeyCodes';
import { PivotItem } from './PivotItem';
import { PivotLinkFormat } from './Pivot.Props';
import { PivotLinkSize } from './Pivot.Props';
import { getId } from '../../utilities/object';

import './Pivot.scss';
import { css } from '../../utilities/css';

/**
 *  Usage:
 *
 *   <Pivot>
 *     <PivotItem linkText="Foo">
 *       <Label>Pivot #1</Label>
 *     </PivotItem>
 *     <PivotItem linkText="Bar">
 *       <Label>Pivot #2</Label>
 *     </PivotItem>
 *     <PivotItem linkText="Bas">
 *     <Label>Pivot #3</Label>
 *     </PivotItem>
 *   </Pivot>
 */

export interface IPivotState {
  links: IPivotItemProps[];
  selectedKey: string;
  selectedTabId: string;
}

export class Pivot extends React.Component<IPivotProps, IPivotState> {
  private _keyToIndexMapping: { [key: string]: number };
  private _keyToTabIds: { [key: string]: string };
  private _pivotId;

  constructor(props: IPivotProps) {
    super(props);
    this._pivotId = getId('Pivot');
    const links: IPivotItemProps[] = this._getPivotLinks(this.props);
    let selectedKey: string;

    if (props.initialSelectedKey) {
      selectedKey = props.initialSelectedKey;
    } else if (props.initialSelectedIndex) {
      selectedKey = links[props.initialSelectedIndex].itemKey;
    } else if (props.selectedKey) {
      selectedKey = props.selectedKey;
    } else {
      selectedKey = links[0].itemKey;
    }

    this.state = {
      links,
      selectedKey,
      selectedTabId: this._keyToTabIds[selectedKey],
    } as IPivotState;

    this._renderLink = this._renderLink.bind(this);
  }

  public componentWillReceiveProps(nextProps: IPivotProps) {
    const links: IPivotItemProps[] = this._getPivotLinks(nextProps);

    let selectedKey: string;
    if (this._isKeyValid(nextProps.selectedKey)) {
      selectedKey = nextProps.selectedKey;
    } else if (this._isKeyValid(this.state.selectedKey)) {
      selectedKey = this.state.selectedKey;
    } else {
      selectedKey = links[0].itemKey;
    }

    this.setState((prevState, props) => ({
      links: links,
      selectedKey,
      selectedTabId: this._keyToTabIds[selectedKey],
    }) as IPivotState);
  }

  public render() {
    return (
      <div>
        { this._renderPivotLinks() }
        { this._renderPivotItem() }
      </div>
    );
  }

  /**
   * Renders the set of links to route between pivots
   */
  private _renderPivotLinks() {
    return (
      <FocusZone direction={ FocusZoneDirection.horizontal }>
        <ul className={ css('ms-Pivot',
          { 'ms-Pivot--large': this.props.linkSize === PivotLinkSize.large },
          { 'ms-Pivot--tabs': this.props.linkFormat === PivotLinkFormat.tabs }) }
          role='tablist'>
          { this.state.links.map(this._renderLink) }
        </ul>
      </FocusZone>
    );
  }

  /**
   * Renders a pivot link
   */
  private _renderLink(link: IPivotItemProps) {
    const { itemKey, itemCount } = link;
    let tabId = this._keyToTabIds[itemKey];
    let countText;
    if (itemCount !== undefined && this.props.linkFormat !== PivotLinkFormat.tabs) {
      countText = <span className='ms-Pivot-count'>({ itemCount })</span>;
    }

    return (
      <button
        id={ tabId }
        key={ itemKey }
        className={ css('ms-Pivot-link', { 'is-selected': this.state.selectedKey === itemKey }) }
        onClick={ this._onLinkClick.bind(this, itemKey) }
        onKeyPress={ this._onKeyPress.bind(this, itemKey) }
        aria-label={ link.ariaLabel }
        role='tab'
        aria-selected={ this.state.selectedKey === itemKey }>
        <span className='ms-Pivot-text'>{ link.linkText }</span>
        { countText }
      </button>
    );
  }

  /**
   * Renders the current Pivot Item
   */
  private _renderPivotItem() {
    const itemKey: string = this.state.selectedKey;
    const index = this._keyToIndexMapping[itemKey];
    let { selectedTabId } = this.state;

    return (
      <div className='pivotItem'
        role='tabpanel'
        aria-labelledby={ selectedTabId }>
        { React.Children.toArray(this.props.children)[index] }
      </div>
    );
  }

  /**
   * Gets the set of PivotLinks as arrary of IPivotItemProps
   * The set of Links is determined by child components of type PivotItem
   */
  private _getPivotLinks(props: IPivotProps): IPivotItemProps[] {
    const links: IPivotItemProps[] = [];
    this._keyToIndexMapping = {};
    this._keyToTabIds = {};

    React.Children.map(props.children, (child: any, index: number) => {
      if (typeof child === 'object' && child.type === PivotItem) {
        const pivotItem = child as PivotItem;
        const itemKey = pivotItem.props.itemKey || index.toString();

        links.push({
          linkText: pivotItem.props.linkText,
          ariaLabel: pivotItem.props.ariaLabel,
          itemKey: itemKey,
          itemCount: pivotItem.props.itemCount
        });
        this._keyToIndexMapping[itemKey] = index;
        this._keyToTabIds[itemKey] = this._pivotId + `-Tab${index}`;
      }
    });

    return links;
  }

  /**
   * whether the key exists in the pivot items.
   */
  private _isKeyValid(itemKey: string) {
    return itemKey !== undefined && this._keyToIndexMapping[itemKey] !== undefined;
  }

  /**
   * Handles the onClick event on PivotLinks
   */
  private _onLinkClick(itemKey: string, ev: React.MouseEvent<HTMLElement>) {
    ev.preventDefault();
    this._updateSelectedItem(itemKey, ev);
  }

  /**
   * Handle the onKeyPress eventon the PivotLinks
   */
  private _onKeyPress(itemKey: string, ev: React.KeyboardEvent<HTMLElement>) {
    ev.preventDefault();
    if (ev.which === KeyCodes.enter) {
      this._updateSelectedItem(itemKey);
    }
  }

  /**
   * Updates the state with the new selected index
   */
  private _updateSelectedItem(itemKey: string, ev?: React.MouseEvent<HTMLElement>) {
    this.setState({
      selectedKey: itemKey,
      selectedTabId: this._keyToTabIds[itemKey]
    } as IPivotState);

    if (this.props.onLinkClick && this._keyToIndexMapping[itemKey] >= 0) {
      const index = this._keyToIndexMapping[itemKey];

      // React.Element<any> cannot directly convert to PivotItem.
      const item = React.Children.toArray(this.props.children)[index] as any;

      if (typeof item === 'object' && item.type === PivotItem) {
        this.props.onLinkClick(item as PivotItem, ev);
      }
    }
  }
}
