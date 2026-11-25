SPEC = dict(
    name='Link', sheet='olderlink.gif', credit='SemiJuggalo', region=(0, 0, 480, 400), parts=dict(B=(0, 330, 800, 800)), sounds='Link',
    anims=dict(
        idle='1.0-1.3', walk='5.0-5.4', run='4.0-4.4', crouch=['0.5'], jumpSquat=['0.5'],
        jump=['0.8'], doubleJump=['1.6', '1.7'], fall=['1.8'], land=['0.5'],
        shield=['3.0'], dodge=['3.4'], roll='2.0-2.3', hurt=['0.6'], hurtAir=['0.7'], tumble=['0.6', '0.7'],
        lie=['B:4.0'], getup=['0.5'], taunt=['B:3.10'], win=['0.0'],
        jab=['4.6', '4.7'], ftilt=['5.5', '5.6', '5.7'], utilt=['B:8.0', 'B:8.1'], dtilt=['1.5'], dash=['4.5', '4.7'],
        fsmash=['B:1.6', 'B:1.8', 'B:1.9'], usmash=['B:8.2', 'B:8.3', 'B:3.1'], dsmash=['B:1.3', 'B:1.5'],
        nair=['B:1.0', 'B:1.2'], fair=['4.7', '4.8'], uair=['B:3.1'], dair=['B:7.3'],
        neutralB=['B:3.2', 'B:3.3'], sideB=['B:9.0', 'B:9.1'], upB=['B:1.0', 'B:1.2', 'B:1.4'], downB=['B:3.8', 'B:3.9'],
        grab=['B:11.0', 'B:11.1'],
    ),
    times=dict(idle=12, fsmash=[8, 5, 12], upB=[5, 5, 12], sideB=[8, 14], grab=[6, 10], neutralB=[10, 12]),
    moves=dict(upB=dict(vy=-7.5, helpless=True), sideB=dict(vx=0), dair=dict(vy=4, hit=dict(dmg=13))),
    stats=dict(weight=104, walkSpeed=1.15, runSpeed=2.3, jumpForce=8.0, doubleJumpForce=7.4),
)
