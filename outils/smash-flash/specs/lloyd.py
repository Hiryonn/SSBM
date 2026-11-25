SPEC = dict(
    name='Lloyd', sheet='Lloydnd3.gif', face='left', credit='Sirth (Tales of Symphonia, NAMCO)', parts=dict(N=dict(sheet='nd3lloyd4hw.gif')),
    sounds='Lloyd', height=56,
    anims=dict(
        idle=['0.0', '0.1'], walk='15.0-15.7', run=['16.0', '16.1'], crouch=['1.2'], jumpSquat=['1.2'],
        jump=['9.0'], doubleJump=['9.1', '9.2'], fall=['9.1'], land=['1.2'],
        shield=['N:6.8'], dodge=['4.4'], roll=['4.3', '4.4'], hurt=['N:10.0'], hurtAir=['N:10.1'], tumble=['N:10.0', 'N:10.1'],
        lie=['1.2'], getup=['1.2'], taunt=['15.4'], win=['N:6.8'],
        jab=['0.2', '0.3'], ftilt=['1.0', '1.1'], utilt=['6.0', '6.1'], dtilt=['5.0', '5.1'], dash=['4.0', '4.2', '4.3'],
        fsmash=['6.3', '6.4', '6.5'], usmash=['9.2', '9.3', '9.4'], dsmash=['11.0', '11.1'],
        nair='10.0-10.3', fair=['3.1', '3.2'], uair=['8.1', '8.2'], dair=['13.1', '13.2'],
        neutralB=['2.0', '2.2', '2.4'], sideB=['12.0', '12.1'], upB='N:4.1-4.6', downB=['8.3', '8.4'],
        grab=['0.4', '0.5'], proj=['2.1', '2.3'],
    ),
    times=dict(idle=14, walk=6, run=5, nair=4, upB=4, fsmash=[10, 5, 12], downB=[10, 20]),
    proj_move=dict(move='neutralB', at=1, vx=5, vy=0, gravity=0.0, life=40, dmg=8, no_melee=True),
    moves=dict(upB=dict(vy=-9, helpless=True), sideB=dict(vx=6, hit=dict(dmg=11)), downB=dict(hit=dict(dmg=14))),
    stats=dict(weight=96, walkSpeed=1.4, runSpeed=3.1, jumpForce=8.6, doubleJumpForce=7.8),
)
