SPEC = dict(
    name='Shadow', sheet='shadowbattle.gif', credit='SonicTeam / ryu', region=(0, 0, 750, 700), sounds='Shadow', height=58,
    anims=dict(
        idle='0.0-0.4', walk='7.16-7.21', run='0.8-0.12', crouch=['2.5'], jumpSquat=['2.5'],
        jump=['13.4'], doubleJump=['13.0', '13.1', '13.2'], fall=['13.6'], land=['2.5'],
        shield=['9.5'], dodge=['1.3', '1.4'], roll=['1.2', '1.3', '1.5'], hurt=['2.6'], hurtAir=['2.7'], tumble=['13.0', '13.1', '13.2'],
        lie=['2.8'], getup=['2.5'], taunt=['9.8', '9.9'], win=['2.4'],
        jab=['1.14', '1.15'], ftilt=['11.7', '11.8', '11.9'], utilt=['11.15'], dtilt=['13.8'], dash=['11.10', '11.11'],
        fsmash=['6.3', '6.4', '6.5'], usmash=['2.11', '2.12'], dsmash='4.10-4.13',
        nair='6.6-6.9', fair=['11.4'], uair=['13.5'], dair=['13.11', '13.12'],
        neutralB='5.2-5.9', sideB=['1.9', '1.10', '1.11'], upB='13.11-13.14', downB='8.7-8.11',
        grab=['10.0', '10.1'],
    ),
    times=dict(idle=10, walk=6, run=5, dsmash=4, neutralB=4, downB=[10, 4, 4, 4, 10], upB=4),
    moves=dict(sideB=dict(vx=8, hit=dict(dmg=9)), upB=dict(vy=-9, helpless=True), downB=dict(hit=dict(dmg=18, bkb=40)),
               neutralB=dict(hit=dict(dmg=10))),
    stats=dict(weight=90, walkSpeed=1.6, runSpeed=3.9, jumpForce=8.8, doubleJumpForce=8.0),
)
