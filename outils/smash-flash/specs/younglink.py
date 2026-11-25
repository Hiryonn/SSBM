SPEC = dict(
    name='Young Link', sheet='younglink.gif', credit='SemiJuggalo', region=(0, 15, 380, 450), sounds='Young Link',
    anims=dict(
        idle=['0.0'], walk='0.1-0.3', run='4.1-4.8', crouch=['0.5'], jumpSquat=['0.5'],
        jump=['2.0'], doubleJump=['2.1', '2.2'], fall=['2.2'], land=['0.5'],
        shield=['0.0'], dodge=['6.0'], roll=['0.4', '0.5'], hurt=['6.0'], hurtAir=['6.1'], tumble=['6.1', '6.2'],
        lie=['7.0'], getup=['0.5'], taunt=['0.6'], win=['0.6'],
        jab=['9.1', '9.3'], ftilt=['9.1', '9.0'], utilt=['13.2'], dtilt=['0.5', '9.3'], dash=['0.4', '9.4'],
        fsmash=['9.1', '9.2', '9.3'], usmash=['13.2', '9.4'], dsmash=['9.3', '9.4'],
        nair=['9.5'], fair=['9.0'], uair=['13.2'], dair=['13.0'],
        neutralB=['17.1'], sideB=['9.4', '9.0'], upB=['9.5', '9.2', '9.5'], downB=['0.6'],
        grab=['0.4', '9.4'],
    ),
    times=dict(fsmash=[8, 5, 12], upB=[5, 5, 12], neutralB=[18]),
    moves=dict(upB=dict(vy=-7.8, helpless=True), dair=dict(vy=4, hit=dict(dmg=12))),
    stats=dict(weight=88, walkSpeed=1.25, runSpeed=2.5, jumpForce=8.6, doubleJumpForce=8.0),
)
