$.fn.textWidth = function(_text, _font){
  var fakeEl = $('<span>').hide().appendTo(document.body).text(_text || this.val() || this.text()).css('font', _font || this.css('font'));
  var width = fakeEl.width();
  fakeEl.remove();
  return width;
};

$.fn.resize = function(){
  var maxWidth = 10000;
  var minWidth = 20;
  var padding = 4;
  $(this).css('width', Math.min(maxWidth, Math.max(minWidth, $(this).textWidth())) + padding);
};

var el = React.createElement;

var star = el(
  "svg", {
    className: "octicon",
    height: "16",
    role: "img",
    version: "1.1",
    viewBox: "0 0 14 16",
    width: "14"
  },
  el("path", {
    d: "M14 6l-4.9-0.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14l4.33-2.33 4.33 2.33L10.4 9.26 14 6z"
  })
);

var fork = el(
  "svg", {
    className: "octicon",
    height: "16",
    role: "img",
    version: "1.1",
    viewBox: "0 0 10 16",
    width: "10"
  },
  el("path", {
    d: "M10 5c0-1.11-0.89-2-2-2s-2 0.89-2 2c0 0.73 0.41 1.38 1 1.72v0.3c-0.02 0.52-0.23 0.98-0.63 1.38s-0.86 0.61-1.38 0.63c-0.83 0.02-1.48 0.16-2 0.45V4.72c0.59-0.34 1-0.98 1-1.72 0-1.11-0.89-2-2-2S0 1.89 0 3c0 0.73 0.41 1.38 1 1.72v6.56C0.41 11.63 0 12.27 0 13c0 1.11 0.89 2 2 2s2-0.89 2-2c0-0.53-0.2-1-0.53-1.36 0.09-0.06 0.48-0.41 0.59-0.47 0.25-0.11 0.56-0.17 0.94-0.17 1.05-0.05 1.95-0.45 2.75-1.25s1.2-1.98 1.25-3.02h-0.02c0.61-0.36 1.02-1 1.02-1.73zM2 1.8c0.66 0 1.2 0.55 1.2 1.2s-0.55 1.2-1.2 1.2-1.2-0.55-1.2-1.2 0.55-1.2 1.2-1.2z m0 12.41c-0.66 0-1.2-0.55-1.2-1.2s0.55-1.2 1.2-1.2 1.2 0.55 1.2 1.2-0.55 1.2-1.2 1.2z m6-8c-0.66 0-1.2-0.55-1.2-1.2s0.55-1.2 1.2-1.2 1.2 0.55 1.2 1.2-0.55 1.2-1.2 1.2z"
  })
);

var nbsp = el('span', {dangerouslySetInnerHTML: {__html: '&nbsp'}});

var tagline = el('h4', {className: 'tagline'}, 'Find software for your species.');

var item = function (item) {

  return el("li", {'key': item._id},
    el("div", {className: 'repo-list-stats'},
        item._source.language,
        star,
        nbsp,
        item._source.stargazers_count,
        fork,
        nbsp,
        item._source.forks_count
    ),
    el("h3", {},
      el("a", { href: item._source.html_url }, item._source.full_name)
    ),
    el("p", { className: 'repo-list-description' }, item._source.description),
    el("hr")
  );
};

var List = function (props) {
  return el("ul", { className: 'list' },
    props.list ? props.list.map(props.template) : null);
};

var ResultCount = function(props) {
  return props.total_count === null ? el('noscript') :
    el('div', {className: 'count'},
      el('h3', {},
        "We've found ",
        props.total_count,
        props.total_count == 1 ? ' result' : ' results'
      ),
      el("hr")
    );
};

var TextInput = React.createClass({
  getInitialState: function () {
    return { value: this.props.initialValue };
  },

  componentWillReceiveProps: function (nextProps) {
    if (nextProps.initialValue !== this.props.initialValue) {
      this.setState({ value: nextProps.initialValue });
    }
  },

  render: function () {
    var onChange = function (event) {
      $('input').resize();
      var value = event.target.value;
      this.setState({ value: value });
      var obj = {};
      obj[this.props.name] = value;
      this.props.onChange(obj);
    }.bind(this);

    return (
      el("input", {
        type: "text",
        className: 'queryBox',
        value: this.state.value,
        onChange: onChange,
        placeholder: this.props.placeholder,
        autoFocus: true,
        onFocus: function(event) {
          var target = event.target;
          target.selectionStart = target.selectionEnd = target.value.length;
        }
      })
    );
  }
});

var DynamicSearch = React.createClass({
  getInitialState: function(){
    return {
      query: decodeURIComponent(window.location.hash.substring(1)),
      items: null,
      total_count: null
    };
  },

  shouldComponentUpdate: function (nextProps, nextState) {
    return !_.isEqual(nextState, this.state);
  },

  componentDidMount: function () {
    this.handleChange(this.state);
  },

  fetchitem: function(query) {
    var search = {
      query: {
        multi_match: {
          fields: ["description", "full_name", "language"],
          fuzziness: "AUTO",
          query: query,
        }
      },
      sort: [{'total_count': 'desc'}],
      size: 10,
    };
    $.ajax({
      type: 'POST',
      url: 'https://dori-us-east-1.searchly.com/xforhumans/_search',
      data: JSON.stringify(search),
      success: this.setitems.bind(this, query),
      headers: {
        "Authorization": "Basic " + btoa('frontend:mvdcgbiotlqrgzobkhjrb55r6lqyoero'),
      }
    });
  },

  setitems: function (query, response) {
    if (this.state.query === query) {
      this.setState({
        items: response.hits.hits,
        total_count: response.hits.total
      });
    }
  },

  handleChange: function(state){
    window.location.hash = encodeURIComponent(state.query);
    if (state.query) {
      this.setState(state);
      this.fetchitem(state.query);
    } else {
      this.setState(this.getInitialState());
    }
  },

  onChange: function(state){
    this.handleChange(state);
  },

  componentWillMount: function(){
    this.onChange = _.debounce(this.onChange, 300);
  },

  render: function() {
    list = this.state.query ?
      el(List, {
        list: this.state.items,
        template: item
      }) : null;

    return (
      el("div", {},
        el('h1', {className: 'titleBar'},
          el(TextInput, {
            initialValue: this.state.query,
            name: 'query',
            onChange: this.onChange,
            componentWillMount: this.componentWillMount,
            placeholder: "x",
            autoFocus: true
          }),
          nbsp,
          "for humans"
        ),
        tagline,
        el('div', {className: 'results'},
          el(ResultCount, {
            total_count: this.state.total_count,
          }),
          list
        )
      )
    );
  }
});

window.app = ReactDOM.render(
  el(DynamicSearch),
  document.getElementById('main')
);

$(window).on("hashchange", function(e) {
  window.app.setState({query: decodeURIComponent(window.location.hash.substring(1))});
  window.app.handleChange(window.app.state);
  $("input").resize();
});

$("a[href^='#']").on("click", function(e) {
  $(document).scrollTop(0);
});

$("input").resize();
