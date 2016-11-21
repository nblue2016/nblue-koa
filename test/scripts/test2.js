script({
  $metas: {
    $version: '1.0.1',
    $args: {
      a1: {
        default: 5,
        type: 'number'
      },
      a2: 6
    }
  },
  _rt1: (ctx, data) => ({
    r1: ctx.$args.a1,
    r2: data
  })
})
